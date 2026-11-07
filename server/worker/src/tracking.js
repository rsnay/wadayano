import { authenticateRequest } from './auth.js';
import { HttpError, jsonResponse, readJsonBody } from './http.js';

const TRACKING_ACTIONS = new Set([
  'STUDENT_REVIEW_QUIZ_ATTEMPT',
  'STUDENT_REVIEW_CONCEPT',
]);

export async function handleTrackingEvent(request, env) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, { allow: 'POST' });
  }

  try {
    const body = await readJsonBody(request);
    if (!body || typeof body !== 'object' || Array.isArray(body)
      || !TRACKING_ACTIONS.has(body.action)
      || !body.context
      || typeof body.context !== 'object'
      || Array.isArray(body.context)) {
      throw new HttpError(400, 'invalid_tracking_event');
    }

    const user = await authenticateRequest(request, env.APP_SECRET);
    const id = crypto.randomUUID();
    const context = JSON.stringify(body.context);
    const statement = user.isInstructor
      ? `INSERT INTO "TrackingEvent"
          ("id", "action", "context", "createdAt", "updatedAt", "studentId", "instructorId")
        SELECT ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, ?
        FROM "Instructor" WHERE "id" = ?`
      : `INSERT INTO "TrackingEvent"
          ("id", "action", "context", "createdAt", "updatedAt", "studentId", "instructorId")
        SELECT ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, NULL
        FROM "Student" WHERE "id" = ?`;
    const result = await env.DB.prepare(statement)
      .bind(id, body.action, context, user.userId, user.userId)
      .run();

    if (result.meta.changes !== 1) {
      throw new HttpError(401, 'unauthorized');
    }
    return jsonResponse({ id }, 201);
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse({ error: error.code }, error.status, error.status === 405 ? { allow: 'POST' } : {});
    }
    console.error('Tracking event insert failed');
    return jsonResponse({ error: 'tracking_unavailable' }, 503);
  }
}
