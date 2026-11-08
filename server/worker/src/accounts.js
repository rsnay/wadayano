import { requireRole, signAuthToken } from './auth.js';
import { requireEmailConfiguration, sendSesEmail } from './email.js';
import { HttpError, jsonResponse, readJsonBody } from './http.js';

const PASSWORD_ITERATIONS = 600_000;
const PASSWORD_MIN_LENGTH = 6;

function base64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function fromBase64Url(value) {
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

function validateEmail(email) {
  return typeof email === 'string'
    && email.length <= 254
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
  if (typeof password !== 'string'
    || password.length < PASSWORD_MIN_LENGTH
    || password.length > 1024) {
    throw new HttpError(400, 'invalid_password');
  }
}

async function passwordHash(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const derived = new Uint8Array(await crypto.subtle.deriveBits({
    name: 'PBKDF2',
    hash: 'SHA-256',
    salt,
    iterations: PASSWORD_ITERATIONS,
  }, key, 256));
  return `pbkdf2-sha256$${PASSWORD_ITERATIONS}$${base64Url(salt)}$${base64Url(derived)}`;
}

async function verifyPassword(password, encoded) {
  const match = /^pbkdf2-sha256\$(\d{6})\$([A-Za-z0-9_-]+)\$([A-Za-z0-9_-]+)$/.exec(encoded);
  if (!match) return false;
  const [, iterationText, saltText, expectedText] = match;
  const iterations = Number(iterationText);
  if (iterations !== PASSWORD_ITERATIONS) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const actual = new Uint8Array(await crypto.subtle.deriveBits({
    name: 'PBKDF2',
    hash: 'SHA-256',
    salt: fromBase64Url(saltText),
    iterations,
  }, key, 256));
  const expected = fromBase64Url(expectedText);
  if (actual.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) {
    difference |= actual[index] ^ expected[index];
  }
  return difference === 0;
}

function accountError(error, operation) {
  if (error instanceof HttpError) {
    return jsonResponse({ error: error.code }, error.status);
  }
  if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE'
    || /unique constraint/i.test(error?.message || '')) {
    return jsonResponse({ error: 'email_already_exists' }, 409);
  }
  console.error(
    `${operation} API failed: ${error instanceof Error ? `${error.name}: ${error.message}` : 'non-Error exception'}`,
  );
  return jsonResponse({ error: 'request_failed' }, 503);
}

export async function instructorSignup(request, env) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, { allow: 'POST' });
  }
  try {
    const body = await readJsonBody(request);
    if (!body || Object.keys(body).some(key => !['email', 'password'].includes(key))
      || !validateEmail(body.email)) {
      throw new HttpError(400, 'invalid_signup');
    }
    validatePassword(body.password);
    const email = body.email.trim().toLowerCase();
    const password = await passwordHash(body.password);
    const instructorId = crypto.randomUUID();
    const token = await signAuthToken(
      { userId: instructorId, isInstructor: true },
      env.APP_SECRET,
    );
    const now = new Date().toISOString();
    const batch = [
      env.DB.prepare(`
        INSERT INTO "Instructor" ("id", "email", "password", "createdAt", "updatedAt")
        VALUES (?, ?, ?, ?, ?)
      `).bind(instructorId, email, password, now, now),
      env.DB.prepare(`
        INSERT INTO "CourseInstructor" ("courseId", "instructorId")
        SELECT "courseId", ?
        FROM "PendingCourseInvite"
        WHERE lower("email") = ? AND "createdAt" >= ?
      `).bind(instructorId, email, new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()),
      env.DB.prepare('DELETE FROM "PendingCourseInvite" WHERE lower("email") = ?')
        .bind(email),
    ];
    await env.DB.batch(batch);
    return jsonResponse({ token }, 201);
  } catch (error) {
    return accountError(error, 'signup');
  }
}

export async function instructorLogin(request, env) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, { allow: 'POST' });
  }
  try {
    const body = await readJsonBody(request);
    if (!body || Object.keys(body).some(key => !['email', 'password'].includes(key))
      || !validateEmail(body.email) || typeof body.password !== 'string') {
      throw new HttpError(400, 'invalid_credentials');
    }
    const instructor = await env.DB.prepare(
      'SELECT "id", "password" FROM "Instructor" WHERE lower("email") = ?',
    ).bind(body.email.trim().toLowerCase()).first();
    if (instructor && /^\$2[aby]\$/.test(instructor.password)) {
      throw new HttpError(409, 'password_reset_required');
    }
    if (!instructor || !await verifyPassword(body.password, instructor.password)) {
      throw new HttpError(401, 'invalid_credentials');
    }
    return jsonResponse({
      token: await signAuthToken({ userId: instructor.id, isInstructor: true }, env.APP_SECRET),
    });
  } catch (error) {
    return accountError(error, 'login');
  }
}

export async function requestInstructorPasswordReset(request, env) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, { allow: 'POST' });
  }
  try {
    const emailConfiguration = requireEmailConfiguration(env, true);
    const body = await readJsonBody(request);
    if (!body || Object.keys(body).some(key => key !== 'email') || !validateEmail(body.email)) {
      throw new HttpError(400, 'invalid_email');
    }
    const email = body.email.trim().toLowerCase();
    const instructor = await env.DB.prepare(
      'SELECT "id" FROM "Instructor" WHERE lower("email") = ?',
    ).bind(email).first();

    if (instructor) {
      const token = base64Url(crypto.getRandomValues(new Uint8Array(32)));
      const now = new Date().toISOString();
      await env.DB.prepare(`
        INSERT INTO "InstructorPasswordResetToken" ("id", "createdAt", "updatedAt", "instructorId")
        VALUES (?, ?, ?, ?)
      `).bind(token, now, now, instructor.id).run();
      const resetUrl = new URL(`/reset-password/${encodeURIComponent(token)}`, emailConfiguration.publicUrl);
      await sendSesEmail(env, {
        to: email,
        subject: 'wadayano Password Reset Request',
        text: `Reset your password using this link: ${resetUrl.href}`,
        html: `<p>Reset your password using this link:</p><p><a href="${resetUrl.href}">${resetUrl.href}</a></p>`,
      });
    }
    return jsonResponse({ sent: true });
  } catch (error) {
    return accountError(error, 'password reset request');
  }
}

export async function resetInstructorPassword(request, env) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, { allow: 'POST' });
  }
  try {
    const body = await readJsonBody(request);
    if (!body || Object.keys(body).some(key => !['token', 'password'].includes(key))
      || typeof body.token !== 'string' || body.token.length > 128) {
      throw new HttpError(400, 'invalid_reset_request');
    }
    validatePassword(body.password);
    const resetToken = await env.DB.prepare(`
      SELECT "instructorId", "createdAt"
      FROM "InstructorPasswordResetToken"
      WHERE "id" = ?
    `).bind(body.token).first();
    const createdAt = resetToken ? new Date(resetToken.createdAt).getTime() : NaN;
    const age = Date.now() - createdAt;
    if (!resetToken || !Number.isFinite(createdAt) || age < 0 || age > 24 * 60 * 60 * 1000) {
      throw new HttpError(400, 'invalid_or_expired_reset_token');
    }

    const now = new Date().toISOString();
    const hashedPassword = await passwordHash(body.password);
    const token = await signAuthToken(
      { userId: resetToken.instructorId, isInstructor: true },
      env.APP_SECRET,
    );
    const result = await env.DB.batch([
      env.DB.prepare(`
        UPDATE "Instructor"
        SET "password" = ?, "updatedAt" = ?
        WHERE "id" = ? AND EXISTS (
          SELECT 1 FROM "InstructorPasswordResetToken" WHERE "id" = ?
        )
      `).bind(hashedPassword, now, resetToken.instructorId, body.token),
      env.DB.prepare('DELETE FROM "InstructorPasswordResetToken" WHERE "id" = ?')
        .bind(body.token),
    ]);
    if (result[0]?.meta?.changes !== 1 || result[1]?.meta?.changes !== 1) {
      throw new HttpError(400, 'invalid_or_expired_reset_token');
    }
    return jsonResponse({ token });
  } catch (error) {
    return accountError(error, 'password reset');
  }
}

export async function updateInstructorProfile(request, env) {
  if (request.method !== 'PATCH') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, { allow: 'PATCH' });
  }
  try {
    const user = await requireRole(request, env, 'instructor');
    const body = await readJsonBody(request);
    const allowed = ['currentPassword', 'newEmail', 'newPassword'];
    if (!body || Object.keys(body).some(key => !allowed.includes(key))
      || typeof body.currentPassword !== 'string') {
      throw new HttpError(400, 'invalid_profile_update');
    }
    const instructor = await env.DB.prepare(
      'SELECT "password" FROM "Instructor" WHERE "id" = ?',
    ).bind(user.userId).first();
    if (!instructor) throw new HttpError(401, 'unauthorized');
    if (/^\$2[aby]\$/.test(instructor.password)) {
      throw new HttpError(409, 'password_reset_required');
    }
    if (!await verifyPassword(body.currentPassword, instructor.password)) {
      throw new HttpError(400, 'current_password_incorrect');
    }

    const updates = [];
    if (typeof body.newEmail === 'string' && body.newEmail.trim() !== '') {
      const email = body.newEmail.trim().toLowerCase();
      if (!validateEmail(email)) throw new HttpError(400, 'invalid_email');
      updates.push(['email', email]);
    } else if (body.newEmail !== undefined && body.newEmail !== null
      && typeof body.newEmail !== 'string') {
      throw new HttpError(400, 'invalid_email');
    }
    if (typeof body.newPassword === 'string' && body.newPassword !== '') {
      validatePassword(body.newPassword);
      updates.push(['password', await passwordHash(body.newPassword)]);
    } else if (body.newPassword !== undefined && body.newPassword !== null
      && typeof body.newPassword !== 'string') {
      throw new HttpError(400, 'invalid_password');
    }

    if (updates.length) {
      const assignments = updates.map(([field]) => `"${field}" = ?`);
      const values = updates.map(([, value]) => value);
      values.push(new Date().toISOString(), user.userId);
      await env.DB.prepare(`
        UPDATE "Instructor"
        SET ${assignments.join(', ')}, "updatedAt" = ?
        WHERE "id" = ?
      `).bind(...values).run();
    }
    return jsonResponse({ id: user.userId });
  } catch (error) {
    return accountError(error, 'profile update');
  }
}
