import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import { test } from 'node:test';
import worker from '../src/index.js';
import { postLtiGrade } from '../src/lti.js';

const appSecret = 'test-only-app-secret';
const consumerSecret = 'test-only-course-secret';

function oauthEncode(value) {
  return encodeURIComponent(value)
    .replace(/[!'()*]/g, character => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
}

function oauthBaseString(url, method, parameters) {
  const entries = [...parameters, ...url.searchParams.entries()]
    .filter(([key]) => key !== 'oauth_signature')
    .map(([key, value]) => [oauthEncode(key), oauthEncode(value)])
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => (
      leftKey < rightKey ? -1
        : leftKey > rightKey ? 1
          : leftValue < rightValue ? -1
            : leftValue > rightValue ? 1
              : 0
    ))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  const baseUrl = `${url.protocol}//${url.host}${url.pathname}`;
  return `${method.toUpperCase()}&${oauthEncode(baseUrl)}&${oauthEncode(entries)}`;
}

function signedLaunchRequest({
  url = 'https://app.example.test/lti/quiz/quiz-1',
  bodyOverrides = {},
  timestamp = Math.floor(Date.now() / 1000),
} = {}) {
  const launchUrl = new URL(url);
  const parameters = new URLSearchParams({
    oauth_consumer_key: 'course-1',
    oauth_nonce: 'nonce-1',
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: String(timestamp),
    oauth_version: '1.0',
    user_id: 'lms-user-1',
    lis_person_name_full: 'Synthetic Student',
    lis_person_contact_email_primary: 'student@example.test',
    lis_outcome_service_url: 'https://lms.example.test/outcome?tenant=course',
    lis_result_sourcedid: 'source<&>id',
    ...bodyOverrides,
  });
  const baseString = oauthBaseString(launchUrl, 'POST', [...parameters.entries()]);
  const signature = createHmac('sha1', `${oauthEncode(consumerSecret)}&`)
    .update(baseString)
    .digest('base64');
  parameters.set('oauth_signature', signature);

  return new Request(launchUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: parameters,
  });
}

function launchEnvironment({ nonceChanges = 1, consentFormUrl = null, consentSaved = false } = {}) {
  const queries = [];
  const statements = [];
  let batchStatements = [];
  return {
    env: {
      APP_SECRET: appSecret,
      DB: {
        prepare(sql) {
          return {
            bind(...values) {
              const statement = { sql, values };
              queries.push(statement);
              return {
                ...statement,
                async first() {
                  if (sql.includes('FROM "Course"')) {
                    return { id: 'course-1', ltiSecret: consumerSecret, consentFormUrl };
                  }
                  if (sql.includes('FROM "Quiz"')) return { id: 'quiz-1' };
                  if (sql.includes('FROM "Student"')) return { id: 'student-1' };
                  if (sql.includes('FROM "CourseConsent"')) return consentSaved ? { 1: 1 } : null;
                  return null;
                },
                async run() {
                  statements.push(statement);
                  return { meta: { changes: sql.includes('INSERT OR IGNORE INTO "LtiNonce"')
                    ? nonceChanges
                    : 1 } };
                },
              };
            },
          };
        },
        async batch(input) {
          batchStatements = input;
          return input.map(() => ({ meta: { changes: 1 } }));
        },
      },
    },
    queries,
    statements,
    get batchStatements() {
      return batchStatements;
    },
  };
}

test('LTI quiz launch verifies OAuth, records replay state, enrolls, and redirects through consent', async () => {
  const bindings = launchEnvironment({ consentFormUrl: 'https://consent.example.test/form' });
  const timestamp = Math.floor(Date.now() / 1000);
  const response = await worker.fetch(signedLaunchRequest({ timestamp }), bindings.env);

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-security-policy'), /frame-ancestors https:/);
  assert.match(response.headers.get('cache-control'), /no-store/);
  const html = await response.text();
  assert.match(html, /\/student\/consent\/[^/]+\/course-1\/quiz\/quiz-1/);
  assert.doesNotMatch(html, new RegExp(consumerSecret));

  const nonceInsert = bindings.statements.find(statement => (
    statement.sql.includes('INSERT OR IGNORE INTO "LtiNonce"')
  ));
  assert.deepEqual(nonceInsert.values.slice(0, 3), [
    'course-1',
    'nonce-1',
    timestamp,
  ]);
  assert.equal(bindings.batchStatements.length, 3);
  assert.match(bindings.batchStatements[0].sql, /INSERT OR IGNORE INTO "CourseStudent"/);
  const attemptInsert = bindings.batchStatements[2];
  assert.match(attemptInsert.sql, /INSERT INTO "QuizAttempt"/);
  const storedLtiInfo = JSON.parse(attemptInsert.values[3]);
  assert.deepEqual(storedLtiInfo, {
    lis_outcome_service_url: 'https://lms.example.test/outcome?tenant=course',
    lis_result_sourcedid: 'source<&>id',
  });
});

test('LTI launches reject tampered signatures before recording nonces or student data', async () => {
  const bindings = launchEnvironment();
  const valid = signedLaunchRequest();
  const body = new URLSearchParams(await valid.text());
  body.set('user_id', 'tampered-user');
  const tampered = new Request(valid.url, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });

  const response = await worker.fetch(tampered, bindings.env);

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'invalid_lti_signature' });
  assert.equal(bindings.statements.length, 0);
  assert.equal(bindings.batchStatements.length, 0);
});

test('LTI launches reject replayed and expired OAuth requests', async () => {
  const replayed = launchEnvironment({ nonceChanges: 0 });
  const replayResponse = await worker.fetch(signedLaunchRequest(), replayed.env);
  assert.equal(replayResponse.status, 409);
  assert.deepEqual(await replayResponse.json(), { error: 'replayed_lti_launch' });
  assert.equal(replayed.statements.some(statement => statement.sql.includes('INSERT INTO "Student"')), false);

  const expired = launchEnvironment();
  const expiredResponse = await worker.fetch(
    signedLaunchRequest({ timestamp: Math.floor(Date.now() / 1000) - 600 }),
    expired.env,
  );
  assert.equal(expiredResponse.status, 401);
  assert.deepEqual(await expiredResponse.json(), { error: 'expired_lti_launch' });
  assert.equal(expired.statements.length, 0);
});

test('LTI outcome posts are signed, bounded, and accept a successful LMS response', async () => {
  let requestOptions;
  const serviceUrl = 'https://lms.example.test/outcome?tenant=course';
  await postLtiGrade(
    {
      lis_outcome_service_url: serviceUrl,
      lis_result_sourcedid: 'source<&>id',
    },
    'course-1',
    consumerSecret,
    0.75,
    async (_url, options) => {
      requestOptions = options;
      return new Response(
        '<imsx_POXEnvelopeResponse><imsx_POXHeader><imsx_POXResponseHeaderInfo><imsx_statusInfo><imsx_codeMajor>success</imsx_codeMajor></imsx_statusInfo></imsx_POXResponseHeaderInfo></imsx_POXHeader></imsx_POXEnvelopeResponse>',
      );
    },
  );

  assert.match(requestOptions.body, /<textString>0\.75<\/textString>/);
  assert.match(requestOptions.body, /source&lt;&amp;&gt;id/);
  assert.equal(
    requestOptions.headers['content-type'],
    'application/xml',
  );
  const authorizationParameters = new Map(
    [...requestOptions.headers.authorization.matchAll(/([a-z_]+)="([^"]*)"/g)]
      .map(([, key, value]) => [key, decodeURIComponent(value)]),
  );
  assert.equal(
    authorizationParameters.get('oauth_body_hash'),
    createHash('sha1').update(requestOptions.body).digest('base64'),
  );
  const signatureParameters = [...authorizationParameters.entries()]
    .filter(([key]) => key !== 'oauth_signature' && key !== 'realm');
  const baseString = oauthBaseString(new URL(serviceUrl), 'POST', signatureParameters);
  const expectedSignature = createHmac('sha1', `${oauthEncode(consumerSecret)}&`)
    .update(baseString)
    .digest('base64');
  assert.equal(authorizationParameters.get('oauth_signature'), expectedSignature);
});

test('LTI outcome posts reject unsafe destinations and non-success responses', async () => {
  let fetchCalls = 0;
  await assert.rejects(
    postLtiGrade(
      { lis_outcome_service_url: 'http://127.0.0.1/admin', lis_result_sourcedid: 'source' },
      'course-1',
      consumerSecret,
      1,
      async () => {
        fetchCalls += 1;
      },
    ),
    /Invalid LTI outcome parameters/,
  );
  assert.equal(fetchCalls, 0);

  await assert.rejects(
    postLtiGrade(
      { lis_outcome_service_url: 'https://lms.example.test/outcome', lis_result_sourcedid: 'source' },
      'course-1',
      consumerSecret,
      1,
      async () => new Response(
        '<imsx_POXEnvelopeResponse><imsx_POXHeader><imsx_POXResponseHeaderInfo><imsx_statusInfo><imsx_codeMajor>failure</imsx_codeMajor></imsx_statusInfo></imsx_POXResponseHeaderInfo></imsx_POXHeader></imsx_POXEnvelopeResponse>',
      ),
    ),
    /rejected the grade/,
  );
});
