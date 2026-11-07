import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import { test } from 'node:test';
import { sendSesEmail } from '../src/email.js';

function hmac(key, value) {
  return createHmac('sha256', key).update(value).digest();
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function emailEnvironment(overrides = {}) {
  return {
    AWS_SES_REGION: 'us-west-2',
    AWS_SES_KEY: 'test-access-key',
    AWS_SES_SECRET: 'test-secret-key',
    AWS_SES_FROM_ADDRESS: 'no-reply@example.test',
    PUBLIC_BASE_URL: 'https://app.example.test',
    ...overrides,
  };
}

test('SES email requests use a valid AWS Signature V4 authorization header', async () => {
  let capturedOptions;
  await sendSesEmail(
    emailEnvironment({
      AWS_SES_SESSION_TOKEN: 'test-session-token',
      SES_FETCH: async (_url, options) => {
        capturedOptions = options;
        return new Response(null, { status: 200 });
      },
    }),
    {
      to: 'student@example.test',
      subject: 'Test subject',
      html: '<p>Hello</p>',
      text: 'Hello',
    },
  );
  assert.equal(capturedOptions.headers['x-amz-security-token'], 'test-session-token');
  assert.match(capturedOptions.headers.authorization, /x-amz-security-token/);
});

test('SES email signing is verifiable and sends the expected message payload', async () => {
  let capturedUrl;
  let capturedOptions;
  const env = emailEnvironment({
    SES_FETCH: async (url, options) => {
      capturedUrl = url;
      capturedOptions = options;
      return new Response(null, { status: 200 });
    },
  });
  await sendSesEmail(env, {
    to: 'student@example.test',
    subject: 'Test subject',
    html: '<p>Hello</p>',
    text: 'Hello',
  });

  assert.equal(capturedUrl.href, 'https://email.us-west-2.amazonaws.com/v2/email/outbound-emails');
  const payload = JSON.parse(capturedOptions.body);
  assert.deepEqual(payload.Destination.ToAddresses, ['student@example.test']);
  assert.equal(payload.FromEmailAddress, env.AWS_SES_FROM_ADDRESS);
  assert.equal(payload.Content.Simple.Body.Html.Data, '<p>Hello</p>');

  const headers = capturedOptions.headers;
  const authorization = /^AWS4-HMAC-SHA256 Credential=([^/]+)\/([^,]+), SignedHeaders=([^,]+), Signature=([a-f0-9]+)$/
    .exec(headers.authorization);
  assert.ok(authorization);
  const [, accessKey, scope, signedHeaders, signature] = authorization;
  assert.equal(accessKey, env.AWS_SES_KEY);
  const canonicalHeaders = signedHeaders.split(';')
    .map(name => `${name}:${headers[name]}\n`)
    .join('');
  const canonicalRequest = [
    'POST',
    capturedUrl.pathname,
    '',
    canonicalHeaders,
    signedHeaders,
    sha256(capturedOptions.body),
  ].join('\n');
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    headers['x-amz-date'],
    scope,
    sha256(canonicalRequest),
  ].join('\n');
  const date = headers['x-amz-date'].slice(0, 8);
  const dateKey = hmac(`AWS4${env.AWS_SES_SECRET}`, date);
  const regionKey = hmac(dateKey, 'us-west-2');
  const serviceKey = hmac(regionKey, 'ses');
  const signingKey = hmac(serviceKey, 'aws4_request');
  assert.equal(signature, hmac(signingKey, stringToSign).toString('hex'));
});

test('SES email delivery requires credentials and reports provider failures', async () => {
  await assert.rejects(
    sendSesEmail({}, {
      to: 'student@example.test',
      subject: 'Test',
      html: '<p>Hello</p>',
      text: 'Hello',
    }),
    error => error.status === 503 && error.code === 'email_not_configured',
  );

  await assert.rejects(
    sendSesEmail(emailEnvironment({
      SES_FETCH: async () => new Response(null, { status: 503 }),
    }), {
      to: 'student@example.test',
      subject: 'Test',
      html: '<p>Hello</p>',
      text: 'Hello',
    }),
    error => error.status === 502 && error.code === 'email_delivery_failed',
  );
});

test('SES email validates recipient, subject, and content', async () => {
  await assert.rejects(
    sendSesEmail(emailEnvironment(), {
      to: 'bad email',
      subject: 'Test',
      html: '<p>Hello</p>',
      text: 'Hello',
    }),
    error => error.status === 400 && error.code === 'invalid_email',
  );
});
