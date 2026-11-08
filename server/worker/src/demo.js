import { signAuthToken } from './auth.js';
import { jsonResponse } from './http.js';

const DEMO_STUDENT_ID = 'demo-student';
const DEMO_COURSE_ID = 'demo-course';
const DEMO_QUIZ_ID = 'demo-practice-quiz';
const DEMO_TOKEN_LIFETIME_SECONDS = 12 * 60 * 60;

export async function createDemoStudentSession(request, env) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, { allow: 'POST' });
  }
  if (!env.APP_SECRET) {
    return jsonResponse({ error: 'authentication_not_configured' }, 503);
  }

  try {
    const student = await env.DB.prepare(`
      SELECT s."id"
      FROM "Student" s
      JOIN "CourseStudent" cs ON cs."studentId" = s."id"
      JOIN "Quiz" q ON q."courseId" = cs."courseId"
      WHERE s."id" = ?
        AND cs."courseId" = ?
        AND q."id" = ?
        AND q."type" = 'PRACTICE'
      LIMIT 1
    `).bind(DEMO_STUDENT_ID, DEMO_COURSE_ID, DEMO_QUIZ_ID).first();
    if (!student) {
      return jsonResponse({ error: 'demo_fixture_not_seeded' }, 503);
    }

    const issuedAt = Math.floor(Date.now() / 1000);
    const token = await signAuthToken({
      userId: student.id,
      isInstructor: false,
      iat: issuedAt,
      exp: issuedAt + DEMO_TOKEN_LIFETIME_SECONDS,
    }, env.APP_SECRET);
    return jsonResponse({
      token,
      redirectTo: '/student/dashboard/demo-course',
    });
  } catch (error) {
    console.error('Demo student login failed', error);
    return jsonResponse({ error: 'demo_login_unavailable' }, 503);
  }
}
