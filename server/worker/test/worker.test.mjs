import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { test } from 'node:test';
import worker from '../src/index.js';

const appSecret = 'test-only-secret';

function token(payload, secret = appSecret) {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const unsigned = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}`;
  const signature = createHmac('sha256', secret).update(unsigned).digest('base64url');
  return `${unsigned}.${signature}`;
}

function environment({
  query = async () => ({ value: 1 }),
  run = async () => ({ meta: { changes: 1 } }),
  assetsResponse,
} = {}) {
  let queriedSql;
  let boundValues;
  let fetchedRequest;

  return {
    env: {
      APP_SECRET: appSecret,
      DB: {
        prepare(sql) {
          queriedSql = sql;
          return {
            first: query,
            bind(...values) {
              boundValues = values;
              return { run };
            },
          };
        },
      },
      ASSETS: {
        async fetch(request) {
          fetchedRequest = request;
          return assetsResponse ?? new Response('asset');
        },
      },
    },
    get queriedSql() {
      return queriedSql;
    },
    get boundValues() {
      return boundValues;
    },
    get fetchedRequest() {
      return fetchedRequest;
    },
  };
}

test('health endpoint checks D1 and returns JSON', async () => {
  const bindings = environment();
  const response = await worker.fetch(new Request('https://example.test/api/health'), bindings.env);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok', database: 'ok' });
  assert.equal(bindings.queriedSql, 'SELECT 1');
});

test('health endpoint reports D1 failures without claiming readiness', async () => {
  const originalError = console.error;
  console.error = () => {};
  try {
    const bindings = environment({ query: async () => { throw new Error('D1 unavailable'); } });
    const response = await worker.fetch(new Request('https://example.test/api/health'), bindings.env);

    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'database_unavailable' });
  } finally {
    console.error = originalError;
  }
});

test('health endpoint rejects non-GET methods', async () => {
  const bindings = environment();
  const response = await worker.fetch(
    new Request('https://example.test/api/health', { method: 'POST' }),
    bindings.env,
  );

  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'GET');
  assert.deepEqual(await response.json(), { error: 'method_not_allowed' });
  assert.equal(bindings.queriedSql, undefined);
});

test('unknown API paths return JSON instead of the SPA fallback', async () => {
  const bindings = environment();
  const response = await worker.fetch(new Request('https://example.test/api/not-an-endpoint'), bindings.env);

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'not_found' });
  assert.equal(bindings.fetchedRequest, undefined);
});

test('LTI paths require a form-encoded launch request', async () => {
  const bindings = environment();
  const response = await worker.fetch(
    new Request('https://example.test/lti/launch', { method: 'POST' }),
    bindings.env,
  );

  assert.equal(response.status, 415);
  assert.deepEqual(await response.json(), { error: 'content_type_must_be_form_urlencoded' });
  assert.equal(bindings.fetchedRequest, undefined);
});

test('non-API and non-LTI paths pass through to static assets', async () => {
  const assetResponse = new Response('spa shell');
  const bindings = environment({ assetsResponse: assetResponse });
  const request = new Request('https://example.test/quizzes/quiz-1');
  const response = await worker.fetch(request, bindings.env);

  assert.equal(response, assetResponse);
  assert.equal(bindings.fetchedRequest, request);
});

test('tracking endpoint records a validated event for the authenticated student', async () => {
  const bindings = environment();
  const request = new Request('https://example.test/api/tracking/events', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token({ userId: 'student-1', isInstructor: false })}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      action: 'STUDENT_REVIEW_CONCEPT',
      context: { page: 'QuizReview', concept: 'Algebra' },
    }),
  });
  const response = await worker.fetch(request, bindings.env);

  assert.equal(response.status, 201);
  assert.match((await response.json()).id, /^[0-9a-f-]{36}$/i);
  assert.match(bindings.queriedSql, /FROM "Student" WHERE "id" = \?/);
  assert.deepEqual(bindings.boundValues.slice(1), [
    'STUDENT_REVIEW_CONCEPT',
    JSON.stringify({ page: 'QuizReview', concept: 'Algebra' }),
    'student-1',
    'student-1',
  ]);
});

test('tracking endpoint associates instructor events with instructors', async () => {
  const bindings = environment();
  const request = new Request('https://example.test/api/tracking/events', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token({ userId: 'instructor-1', isInstructor: true })}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      action: 'STUDENT_REVIEW_QUIZ_ATTEMPT',
      context: { courseId: 'course-1' },
    }),
  });
  const response = await worker.fetch(request, bindings.env);

  assert.equal(response.status, 201);
  assert.match(bindings.queriedSql, /FROM "Instructor" WHERE "id" = \?/);
  assert.deepEqual(bindings.boundValues.slice(1), [
    'STUDENT_REVIEW_QUIZ_ATTEMPT',
    JSON.stringify({ courseId: 'course-1' }),
    'instructor-1',
    'instructor-1',
  ]);
});

test('tracking endpoint rejects invalid and expired bearer tokens', async () => {
  const invalidTokens = [
    'not-a-token',
    token({ userId: 'student-1', isInstructor: false, exp: 1 }),
  ];

  for (const bearerToken of invalidTokens) {
    const bindings = environment();
    const request = new Request('https://example.test/api/tracking/events', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${bearerToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ action: 'STUDENT_REVIEW_CONCEPT', context: {} }),
    });
    const response = await worker.fetch(request, bindings.env);

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: 'unauthorized' });
    assert.equal(bindings.boundValues, undefined);
  }
});

test('tracking endpoint rejects unsupported actions, malformed JSON, and oversized payloads', async () => {
  const invalidRequests = [
    new Request('https://example.test/api/tracking/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'UNSUPPORTED', context: {} }),
    }),
    new Request('https://example.test/api/tracking/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{',
    }),
    new Request('https://example.test/api/tracking/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'STUDENT_REVIEW_CONCEPT',
        context: { value: 'x'.repeat(16 * 1024) },
      }),
    }),
  ];
  const expectedStatuses = [400, 400, 413];

  for (const [index, request] of invalidRequests.entries()) {
    const response = await worker.fetch(request, environment().env);
    assert.equal(response.status, expectedStatuses[index]);
  }
});

test('tracking endpoint rejects missing auth and reports D1 failures explicitly', async () => {
  const unauthenticated = await worker.fetch(
    new Request('https://example.test/api/tracking/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'STUDENT_REVIEW_CONCEPT', context: {} }),
    }),
    environment().env,
  );
  assert.equal(unauthenticated.status, 401);

  const originalError = console.error;
  console.error = () => {};
  try {
    const bindings = environment({ run: async () => { throw new Error('D1 unavailable'); } });
    const request = new Request('https://example.test/api/tracking/events', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token({ userId: 'student-1', isInstructor: false })}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ action: 'STUDENT_REVIEW_CONCEPT', context: {} }),
    });
    const response = await worker.fetch(request, bindings.env);

    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'tracking_unavailable' });
  } finally {
    console.error = originalError;
  }
});
