import assert from 'node:assert/strict';
import { test } from 'node:test';
import worker from '../src/index.js';
import { authenticateRequest } from '../src/auth.js';

const appSecret = 'test-only-app-secret';

function environment({ enabled = true, studentExists = true, secret = appSecret } = {}) {
  let queries = 0;
  return {
    env: {
      APP_SECRET: secret,
      DEMO_STUDENT_ENABLED: enabled ? 'true' : 'false',
      DB: {
        prepare(sql) {
          assert.match(sql, /FROM "Student"/);
          assert.match(sql, /q\."type" = 'PRACTICE'/);
          return {
            bind(...values) {
              assert.deepEqual(values, ['demo-student', 'demo-course', 'demo-practice-quiz']);
              return {
                async first() {
                  queries += 1;
                  return studentExists ? { id: 'demo-student' } : null;
                },
              };
            },
          };
        },
      },
    },
    get queries() {
      return queries;
    },
  };
}

function demoRequest(url = 'http://localhost:8787/api/demo/student-session', method = 'POST') {
  return new Request(url, { method });
}

test('local demo login issues an authenticated student token only for the seeded fixture', async () => {
  const bindings = environment();
  const response = await worker.fetch(demoRequest(), bindings.env);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const result = await response.json();
  assert.equal(result.redirectTo, '/student/dashboard/demo-course');
  const user = await authenticateRequest(
    new Request('http://localhost/api/student', {
      headers: { authorization: `Bearer ${result.token}` },
    }),
    appSecret,
  );
  assert.equal(user.userId, 'demo-student');
  assert.equal(user.isInstructor, false);
  assert.ok(user.exp > Math.floor(Date.now() / 1000));
  assert.equal(bindings.queries, 1);
});

test('demo login is unavailable when disabled or outside a local HTTP origin', async () => {
  const unavailableRequests = [
    { url: 'http://localhost:8787/api/demo/student-session', enabled: false },
    { url: 'https://app.example.test/api/demo/student-session', enabled: true },
    { url: 'https://localhost:8787/api/demo/student-session', enabled: true },
  ];

  for (const { url, enabled } of unavailableRequests) {
    const bindings = environment({ enabled });
    const response = await worker.fetch(demoRequest(url), bindings.env);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: 'not_found' });
    assert.equal(bindings.queries, 0);
  }
});

test('demo login requires POST, a configured secret, and seeded fixture data', async () => {
  const methodBindings = environment();
  const methodResponse = await worker.fetch(
    demoRequest('http://localhost:8787/api/demo/student-session', 'GET'),
    methodBindings.env,
  );
  assert.equal(methodResponse.status, 405);
  assert.equal(methodResponse.headers.get('allow'), 'POST');
  assert.equal(methodBindings.queries, 0);

  const secretBindings = environment({ secret: '' });
  const secretResponse = await worker.fetch(demoRequest(), secretBindings.env);
  assert.equal(secretResponse.status, 503);
  assert.deepEqual(await secretResponse.json(), { error: 'authentication_not_configured' });
  assert.equal(secretBindings.queries, 0);

  const fixtureBindings = environment({ studentExists: false });
  const fixtureResponse = await worker.fetch(demoRequest(), fixtureBindings.env);
  assert.equal(fixtureResponse.status, 503);
  assert.deepEqual(await fixtureResponse.json(), { error: 'demo_fixture_not_seeded' });
  assert.equal(fixtureBindings.queries, 1);
});
