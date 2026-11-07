import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { test } from 'node:test';
import worker from '../src/index.js';

const appSecret = 'test-only-app-secret';

function token(payload) {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const unsigned = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}`;
  const signature = createHmac('sha256', appSecret).update(unsigned).digest('base64url');
  return `${unsigned}.${signature}`;
}

function request(path, { method = 'POST', body, user = { userId: 'instructor-1', isInstructor: true } } = {}) {
  const headers = { authorization: `Bearer ${token(user)}` };
  if (body !== undefined) headers['content-type'] = 'application/json';
  return new Request(`https://app.example.test${path}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function environment({
  course = { id: 'course-1', title: 'Research Course' },
  invitedInstructor = null,
  activeInvite = null,
  account = { email: 'student@example.test' },
  emailStatus = 200,
} = {}) {
  const statements = [];
  const emails = [];
  let currentEmailStatus = emailStatus;
  let membershipChanges = 1;
  return {
    env: {
      APP_SECRET: appSecret,
      AWS_SES_REGION: 'us-west-2',
      AWS_SES_KEY: 'test-access-key',
      AWS_SES_SECRET: 'test-secret-key',
      AWS_SES_FROM_ADDRESS: 'no-reply@example.test',
      PUBLIC_BASE_URL: 'https://app.example.test',
      FEEDBACK_EMAIL_ADDRESS: 'feedback@example.test',
      SES_FETCH: async (url, options) => {
        emails.push({ url: String(url), options });
        return new Response(null, { status: currentEmailStatus });
      },
      DB: {
        prepare(sql) {
          return {
            bind(...values) {
              const statement = { sql, values };
              statements.push(statement);
              return {
                async first() {
                  if (sql.includes('FROM "Course" c')) return course;
                  if (sql.includes('FROM "Instructor"')) return invitedInstructor;
                  if (sql.includes('FROM "PendingCourseInvite"')) return activeInvite;
                  if (sql.includes('FROM "Student"') || sql.includes('FROM "Instructor" WHERE "id"')) {
                    return account;
                  }
                  return null;
                },
                async run() {
                  return {
                    meta: {
                      changes: sql.includes('INSERT OR IGNORE INTO "CourseInstructor"')
                        ? membershipChanges
                        : 1,
                    },
                  };
                },
              };
            },
          };
        },
        async batch(input) {
          return input.map(() => ({ meta: { changes: 1 } }));
        },
      },
    },
    statements,
    emails,
    setEmailStatus(status) {
      currentEmailStatus = status;
    },
    setMembershipChanges(changes) {
      membershipChanges = changes;
    },
  };
}

test('course instructor invitations are authorized, persisted, and emailed through SES', async () => {
  const bindings = environment();
  const response = await worker.fetch(
    request('/api/courses/course-1/instructors', { body: { email: ' New.Teacher@Example.test ' } }),
    bindings.env,
  );

  assert.equal(response.status, 200);
  assert.match((await response.json()).message, /sent an invite/);
  const invite = bindings.statements.find(statement => (
    statement.sql.includes('INSERT INTO "PendingCourseInvite"')
  ));
  assert.equal(invite.values[1], 'new.teacher@example.test');
  assert.equal(invite.values[2], invite.values[3]);
  assert.equal(invite.values[4], 'course-1');
  assert.equal(bindings.emails.length, 1);
  assert.equal(bindings.emails[0].url, 'https://email.us-west-2.amazonaws.com/v2/email/outbound-emails');
  const email = JSON.parse(bindings.emails[0].options.body);
  assert.deepEqual(email.Destination.ToAddresses, ['new.teacher@example.test']);
  assert.match(email.Content.Simple.Body.Text.Data, /https:\/\/app\.example\.test\/signup/);
});

test('instructor invites do not write or send email for an unowned course', async () => {
  const bindings = environment({ course: null });
  const response = await worker.fetch(
    request('/api/courses/course-1/instructors', { body: { email: 'teacher@example.test' } }),
    bindings.env,
  );

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'course_not_found' });
  assert.equal(bindings.emails.length, 0);
  assert.equal(bindings.statements.some(statement => (
    statement.sql.includes('INSERT INTO "PendingCourseInvite"')
  )), false);
});

test('instructor invite reports SES delivery failure instead of claiming success', async () => {
  const bindings = environment({ emailStatus: 503 });
  const response = await worker.fetch(
    request('/api/courses/course-1/instructors', { body: { email: 'teacher@example.test' } }),
    bindings.env,
  );
  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { error: 'email_delivery_failed' });
});

test('existing instructor receives access and an email notification', async () => {
  const bindings = environment({ invitedInstructor: { id: 'instructor-2' } });
  const response = await worker.fetch(
    request('/api/courses/course-1/instructors', { body: { email: 'teacher@example.test' } }),
    bindings.env,
  );

  assert.equal(response.status, 200);
  assert.match((await response.json()).message, /can now access/);
  assert.equal(bindings.emails.length, 1);
  const membership = bindings.statements.find(statement => (
    statement.sql.includes('INSERT OR IGNORE INTO "CourseInstructor"')
  ));
  assert.deepEqual(membership.values, ['course-1', 'instructor-2']);
});

test('existing instructor can retry notification after a delivery failure', async () => {
  const bindings = environment({
    invitedInstructor: { id: 'instructor-2' },
    emailStatus: 503,
  });
  const firstResponse = await worker.fetch(
    request('/api/courses/course-1/instructors', { body: { email: 'teacher@example.test' } }),
    bindings.env,
  );
  assert.equal(firstResponse.status, 502);

  bindings.setMembershipChanges(0);
  bindings.setEmailStatus(200);
  const retryResponse = await worker.fetch(
    request('/api/courses/course-1/instructors', { body: { email: 'teacher@example.test' } }),
    bindings.env,
  );
  assert.equal(retryResponse.status, 200);
  assert.match((await retryResponse.json()).message, /already has access/);
  assert.equal(bindings.emails.length, 2);
});

test('active pending invitation is resent without creating a duplicate', async () => {
  const bindings = environment({ activeInvite: { id: 'existing-invite' } });
  const response = await worker.fetch(
    request('/api/courses/course-1/instructors', { body: { email: 'teacher@example.test' } }),
    bindings.env,
  );

  assert.equal(response.status, 200);
  assert.equal(bindings.emails.length, 1);
  assert.equal(bindings.statements.some(statement => (
    statement.sql.includes('INSERT INTO "PendingCourseInvite"')
  )), false);
});

test('feedback API honors anonymity and awaits successful email delivery', async () => {
  const bindings = environment();
  const response = await worker.fetch(
    request('/api/feedback', {
      body: { anonymous: true, message: 'A synthetic feedback message' },
      user: { userId: 'student-1', isInstructor: false },
    }),
    bindings.env,
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { sent: true });
  assert.equal(bindings.emails.length, 1);
  const email = JSON.parse(bindings.emails[0].options.body);
  assert.deepEqual(email.Destination.ToAddresses, ['feedback@example.test']);
  assert.match(email.Content.Simple.Body.Text.Data, /Feedback from Anonymous/);
  assert.doesNotMatch(email.Content.Simple.Body.Text.Data, /student@example\.test/);
});

test('feedback API reports provider failures without returning a success response', async () => {
  const bindings = environment({ emailStatus: 503 });
  const response = await worker.fetch(
    request('/api/feedback', {
      body: { anonymous: false, message: 'A synthetic feedback message' },
      user: { userId: 'student-1', isInstructor: false },
    }),
    bindings.env,
  );

  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { error: 'email_delivery_failed' });
});
