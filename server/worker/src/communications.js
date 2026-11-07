import { authenticateRequest, requireRole } from './auth.js';
import { requireEmailConfiguration, sendSesEmail } from './email.js';
import { HttpError, jsonResponse, readJsonBody } from './http.js';

const MAX_FEEDBACK_LENGTH = 10_000;
const MAX_INVITE_AGE_MS = 48 * 60 * 60 * 1000;

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function baseEmail(content) {
  return `<div style="font-family:Arial,sans-serif;max-width:640px;margin:2em auto;padding:24px;background:#f3f3f3"><h2>wadayano</h2><hr>${content}</div>`;
}

function emailError(error, operation) {
  if (error instanceof HttpError) {
    return jsonResponse({ error: error.code }, error.status);
  }
  console.error(`${operation} failed`);
  return jsonResponse({ error: `${operation}_failed` }, 503);
}

export async function sendFeedback(request, env) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, { allow: 'POST' });
  }

  try {
    requireEmailConfiguration(env);
    if (!env.FEEDBACK_EMAIL_ADDRESS) {
      throw new HttpError(503, 'email_not_configured');
    }
    const user = await authenticateRequest(request, env.APP_SECRET);
    const body = await readJsonBody(request, 12 * 1024);
    if (!body || typeof body !== 'object' || Array.isArray(body)
      || Object.keys(body).length !== 2
      || typeof body.anonymous !== 'boolean'
      || typeof body.message !== 'string'
      || body.message.trim().length === 0
      || body.message.length > MAX_FEEDBACK_LENGTH) {
      throw new HttpError(400, 'invalid_feedback');
    }

    const table = user.isInstructor ? 'Instructor' : 'Student';
    const account = await env.DB.prepare(
      `SELECT "email" FROM "${table}" WHERE "id" = ?`,
    ).bind(user.userId).first();
    if (!account) {
      throw new HttpError(401, 'unauthorized');
    }

    const sender = body.anonymous ? 'Anonymous' : account.email;
    const html = baseEmail(
      `<p>Feedback from ${escapeHtml(sender)}</p><hr><pre style="white-space:pre-wrap">${escapeHtml(body.message)}</pre>`,
    );
    const text = `Feedback from ${sender}\n\n${body.message}`;
    await sendSesEmail(env, {
      to: env.FEEDBACK_EMAIL_ADDRESS,
      subject: `wadayano feedback - ${new Date().toISOString()}`,
      html,
      text,
    });
    return jsonResponse({ sent: true });
  } catch (error) {
    return emailError(error, 'feedback');
  }
}

export async function inviteCourseInstructor(request, env, courseId) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, { allow: 'POST' });
  }

  try {
    const emailConfig = requireEmailConfiguration(env, true);
    const user = await requireRole(request, env, 'instructor');
    const body = await readJsonBody(request, 1024);
    if (!body || typeof body !== 'object' || Array.isArray(body)
      || Object.keys(body).length !== 1
      || typeof body.email !== 'string' || body.email.length > 254) {
      throw new HttpError(400, 'invalid_invitation');
    }
    const email = body.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HttpError(400, 'invalid_email');
    }

    const course = await env.DB.prepare(`
      SELECT c."id", c."title"
      FROM "Course" c
      JOIN "CourseInstructor" ci ON ci."courseId" = c."id"
      WHERE c."id" = ? AND ci."instructorId" = ?
    `).bind(courseId, user.userId).first();
    if (!course) {
      throw new HttpError(404, 'course_not_found');
    }

    const invitedInstructor = await env.DB.prepare(
      'SELECT "id" FROM "Instructor" WHERE "email" = ?',
    ).bind(email).first();
    if (invitedInstructor) {
      const membership = await env.DB.prepare(`
        INSERT OR IGNORE INTO "CourseInstructor" ("courseId", "instructorId")
        VALUES (?, ?)
      `).bind(courseId, invitedInstructor.id).run();
      await sendSesEmail(env, {
        to: email,
        subject: 'wadayano course invite',
        html: baseEmail(
          `<p>You have been added to “${escapeHtml(course.title)}.”</p><p><a href="${emailConfig.publicUrl}/instructor/course/${encodeURIComponent(courseId)}">View course</a></p>`,
        ),
        text: `You have been added to "${course.title}".\n${emailConfig.publicUrl}/instructor/course/${encodeURIComponent(courseId)}`,
      });
      return jsonResponse({
        message: membership.meta.changes === 1
          ? `Success! ${email} can now access this course in their wadayano account`
          : `${email} already has access to this course`,
      });
    }

    const cutoff = new Date(Date.now() - MAX_INVITE_AGE_MS).toISOString();
    let invite = await env.DB.prepare(`
      SELECT "id"
      FROM "PendingCourseInvite"
      WHERE "courseId" = ? AND "email" = ? AND "createdAt" >= ?
      ORDER BY "createdAt" DESC, "id"
      LIMIT 1
    `).bind(courseId, email, cutoff).first();
    if (!invite) {
      invite = { id: crypto.randomUUID() };
      const now = new Date().toISOString();
      const created = await env.DB.prepare(`
        INSERT INTO "PendingCourseInvite"
          ("id", "email", "createdAt", "updatedAt", "courseId")
        VALUES (?, ?, ?, ?, ?)
      `).bind(invite.id, email, now, now, courseId).run();
      if (created.meta.changes !== 1) {
        throw new HttpError(503, 'invitation_create_failed');
      }
    }

    await sendSesEmail(env, {
      to: email,
      subject: 'wadayano course invite',
      html: baseEmail(
        `<p>You have been invited to join “${escapeHtml(course.title)}.”</p><p>Create your instructor account using this email address within 48 hours.</p><p><a href="${emailConfig.publicUrl}/signup">Create account</a></p>`,
      ),
      text: `You have been invited to join "${course.title}". Create your instructor account using this email address within 48 hours: ${emailConfig.publicUrl}/signup`,
    });
    return jsonResponse({
      message: `Success! ${email} has been sent an invite to join wadayano. When the instructor signs up within 48 hours, this course will be automatically added to their account.`,
    });
  } catch (error) {
    return emailError(error, 'invitation');
  }
}
