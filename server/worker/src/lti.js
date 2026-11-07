import { HttpError, jsonResponse } from './http.js';
import { signAuthToken } from './auth.js';

const MAX_LAUNCH_BYTES = 64 * 1024;
const MAX_LAUNCH_PARAMETERS = 256;
const MAX_OAUTH_CLOCK_SKEW_SECONDS = 5 * 60;
const JWT_LIFETIME_SECONDS = 12 * 60 * 60;
const OUTCOME_RESPONSE_BYTES = 64 * 1024;

function encodeBase64(bytes) {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function oauthEncode(value) {
  return encodeURIComponent(value)
    .replace(/[!'()*]/g, character => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
}

function sortedParameters(parameters) {
  return parameters
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
}

function signatureBaseString(url, method, parameters) {
  const baseUrl = `${url.protocol}//${url.host}${url.pathname}`;
  return [
    method.toUpperCase(),
    oauthEncode(baseUrl),
    oauthEncode(sortedParameters([...parameters, ...url.searchParams.entries()])),
  ].join('&');
}

function oauthSignatureBytes(signature) {
  const normalized = signature.replace(/-/g, '+').replace(/_/g, '/');
  if (!/^[\w+/]*={0,2}$/.test(normalized)) {
    throw new Error('Invalid OAuth signature encoding');
  }
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

async function hmacSha1(secret, value) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)));
}

async function readLaunchParameters(request) {
  const contentType = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  if (contentType !== 'application/x-www-form-urlencoded') {
    throw new HttpError(415, 'content_type_must_be_form_urlencoded');
  }

  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_LAUNCH_BYTES) {
    throw new HttpError(413, 'launch_payload_too_large');
  }
  if (!request.body) {
    throw new HttpError(400, 'invalid_launch');
  }

  const reader = request.body.getReader();
  const chunks = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_LAUNCH_BYTES) {
      await reader.cancel();
      throw new HttpError(413, 'launch_payload_too_large');
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let body;
  try {
    body = new URLSearchParams(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new HttpError(400, 'invalid_launch');
  }
  const url = new URL(request.url);
  const parameterCount = [...body].length + [...url.searchParams].length;
  if (parameterCount > MAX_LAUNCH_PARAMETERS) {
    throw new HttpError(400, 'too_many_launch_parameters');
  }
  return { body, url };
}

function oneParameter(parameters, key, required = false) {
  const values = parameters.getAll(key);
  if (values.length > 1 || (required && values.length !== 1)) {
    throw new HttpError(400, 'invalid_launch');
  }
  return values[0] ?? null;
}

async function verifyLaunchSignature(request, body, url, consumerKey, secret) {
  const oauthParameters = [...body.entries()].filter(([key]) => key.startsWith('oauth_'));
  const queryOAuthParameters = [...url.searchParams.entries()]
    .filter(([key]) => key.startsWith('oauth_'));
  const allOAuthParameters = [...oauthParameters, ...queryOAuthParameters];
  if (allOAuthParameters.some(([key], index) => (
    allOAuthParameters.findIndex(([candidate]) => candidate === key) !== index
  ))) {
    throw new HttpError(401, 'invalid_lti_signature');
  }

  const getOAuth = key => oneParameter(
    new URLSearchParams(allOAuthParameters.filter(([name]) => name === key)
      .map(([, value]) => [key, value])),
    key,
  );

  const suppliedConsumerKey = getOAuth('oauth_consumer_key');
  const signature = getOAuth('oauth_signature');
  const method = getOAuth('oauth_signature_method');
  const version = getOAuth('oauth_version');
  const nonce = getOAuth('oauth_nonce');
  const timestamp = getOAuth('oauth_timestamp');
  if (suppliedConsumerKey !== consumerKey
    || !signature
    || method !== 'HMAC-SHA1'
    || version !== '1.0'
    || !nonce
    || nonce.length > 256
    || !/^\d{1,12}$/.test(timestamp ?? '')) {
    throw new HttpError(401, 'invalid_lti_signature');
  }

  const timestampSeconds = Number(timestamp);
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - timestampSeconds) > MAX_OAUTH_CLOCK_SKEW_SECONDS) {
    throw new HttpError(401, 'expired_lti_launch');
  }

  let signatureMatches = false;
  try {
    const baseString = signatureBaseString(url, request.method, [...body.entries()]);
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(`${oauthEncode(secret)}&`),
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['verify'],
    );
    signatureMatches = await crypto.subtle.verify(
      'HMAC',
      key,
      oauthSignatureBytes(signature),
      new TextEncoder().encode(baseString),
    );
  } catch {
    throw new HttpError(401, 'invalid_lti_signature');
  }
  if (!signatureMatches) {
    throw new HttpError(401, 'invalid_lti_signature');
  }

  return { nonce, timestampSeconds };
}

function validOutcomeUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && !url.username
      && !url.password
      && !url.port
      && !url.hostname.startsWith('[')
      && !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(url.hostname)
      && url.hostname !== 'localhost'
      && !url.hostname.endsWith('.localhost')
      && !url.hostname.endsWith('.local')
      && !url.hostname.endsWith('.internal');
  } catch {
    return false;
  }
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function launchPage(path) {
  const scriptPath = JSON.stringify(path).replace(/</g, '\\u003c');
  const body = `<!doctype html><html><head><meta charset="utf-8"><title>Continue to wadayano</title></head><body><script>function inFrame(){try{return window.self!==window.top}catch(e){return true}}if(!inFrame()){window.location.replace(${scriptPath})}</script><h3><a href="${escapeHtml(path)}" target="_blank" rel="noopener noreferrer">Continue &gt;</a></h3></body></html>`;
  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'content-security-policy': "default-src 'none'; script-src 'unsafe-inline'; frame-ancestors https:; base-uri 'none'",
      'referrer-policy': 'no-referrer',
      'x-content-type-options': 'nosniff',
    },
  });
}

function launchError(error) {
  if (error instanceof HttpError) {
    return jsonResponse({ error: error.code }, error.status);
  }
  console.error('LTI launch failed');
  return jsonResponse({ error: 'lti_launch_unavailable' }, 503);
}

function requestedLaunch(url) {
  const path = /^\/lti\/([^/]+)\/([^/]+)\/?$/.exec(url.pathname);
  const action = path ? decodeURIComponent(path[1]) : oneParameter(url.searchParams, 'action');
  const objectId = path
    ? decodeURIComponent(path[2])
    : oneParameter(url.searchParams, 'objectId');
  if (action !== 'quiz' || !objectId || objectId.length > 200) {
    throw new HttpError(400, 'unsupported_lti_launch');
  }
  return { action, objectId };
}

export async function handleLtiLaunch(request, env) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'method_not_allowed' }, 405, { allow: 'POST' });
  }

  try {
    if (!env.APP_SECRET) {
      throw new HttpError(503, 'authentication_not_configured');
    }
    const { body, url } = await readLaunchParameters(request);
    const { action, objectId } = requestedLaunch(url);
    const courseId = oneParameter(body, 'oauth_consumer_key', true);
    if (!courseId || courseId.length > 200) {
      throw new HttpError(400, 'invalid_lti_launch');
    }

    const course = await env.DB.prepare(`
      SELECT "id", "ltiSecret", "consentFormUrl"
      FROM "Course"
      WHERE "id" = ?
    `).bind(courseId).first();
    if (!course?.ltiSecret) {
      throw new HttpError(401, 'invalid_lti_consumer');
    }

    const studentLtiId = oneParameter(body, 'user_id', true);
    const studentName = oneParameter(body, 'lis_person_name_full', true);
    const studentEmail = oneParameter(body, 'lis_person_contact_email_primary', true);
    if (!studentLtiId || studentLtiId.length > 500
      || !studentName || studentName.length > 500
      || !studentEmail || studentEmail.length > 320) {
      throw new HttpError(400, 'invalid_lti_launch');
    }

    const outcomeUrl = oneParameter(body, 'lis_outcome_service_url');
    const sourcedId = oneParameter(body, 'lis_result_sourcedid');
    if ((outcomeUrl || sourcedId)
      && (!validOutcomeUrl(outcomeUrl) || !sourcedId || sourcedId.length > 4096)) {
      throw new HttpError(400, 'invalid_lti_outcome_service');
    }

    if (action === 'quiz') {
      const quiz = await env.DB.prepare(`
        SELECT "id"
        FROM "Quiz"
        WHERE "id" = ? AND "courseId" = ?
      `).bind(objectId, courseId).first();
      if (!quiz) {
        throw new HttpError(404, 'quiz_not_found');
      }
    }

    const { nonce, timestampSeconds } = await verifyLaunchSignature(
      request,
      body,
      url,
      courseId,
      course.ltiSecret,
    );

    const now = new Date().toISOString();
    await env.DB.prepare(`
      DELETE FROM "LtiNonce"
      WHERE rowid IN (
        SELECT rowid
        FROM "LtiNonce"
        WHERE "timestampSec" < ?
        ORDER BY "timestampSec"
        LIMIT 500
      )
    `).bind(Math.floor(Date.now() / 1000) - MAX_OAUTH_CLOCK_SKEW_SECONDS * 2).run();
    const nonceResult = await env.DB.prepare(`
      INSERT OR IGNORE INTO "LtiNonce" ("consumerKey", "nonce", "timestampSec", "createdAt")
      VALUES (?, ?, ?, ?)
    `).bind(courseId, nonce, timestampSeconds, now).run();
    if (nonceResult.meta.changes !== 1) {
      throw new HttpError(409, 'replayed_lti_launch');
    }

    const candidateStudentId = crypto.randomUUID();
    await env.DB.prepare(`
      INSERT INTO "Student"
        ("id", "ltiUserId", "email", "name", "createdAt", "updatedAt")
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT("ltiUserId") DO UPDATE SET
        "email" = excluded."email",
        "name" = excluded."name",
        "updatedAt" = excluded."updatedAt"
    `).bind(
      candidateStudentId,
      studentLtiId,
      studentEmail,
      studentName,
      now,
      now,
    ).run();
    const student = await env.DB.prepare(
      'SELECT "id" FROM "Student" WHERE "ltiUserId" = ?',
    ).bind(studentLtiId).first();
    if (!student) {
      throw new Error('LTI student could not be read after upsert');
    }

    const ltiSessionInfo = outcomeUrl
      ? JSON.stringify({
        lis_outcome_service_url: outcomeUrl,
        lis_result_sourcedid: sourcedId,
      })
      : null;
    const statements = [
      env.DB.prepare(`
        INSERT OR IGNORE INTO "CourseStudent" ("courseId", "studentId")
        VALUES (?, ?)
      `).bind(courseId, student.id),
    ];
    if (action === 'quiz') {
      statements.push(env.DB.prepare(`
        UPDATE "QuizAttempt"
        SET "ltiSessionInfo" = ?, "updatedAt" = ?
        WHERE "id" = (
          SELECT "id"
          FROM "QuizAttempt"
          WHERE "studentId" = ? AND "quizId" = ? AND "completed" IS NULL
          ORDER BY "createdAt", "id"
          LIMIT 1
        )
      `).bind(ltiSessionInfo, now, student.id, objectId));
      statements.push(env.DB.prepare(`
        INSERT INTO "QuizAttempt"
          ("id", "createdAt", "updatedAt", "ltiSessionInfo", "studentId", "quizId")
        SELECT ?, ?, ?, ?, ?, ?
        WHERE NOT EXISTS (
          SELECT 1
          FROM "QuizAttempt"
          WHERE "studentId" = ? AND "quizId" = ? AND "completed" IS NULL
        )
      `).bind(
        crypto.randomUUID(),
        now,
        now,
        ltiSessionInfo,
        student.id,
        objectId,
        student.id,
        objectId,
      ));
    }
    await env.DB.batch(statements);

    const token = await signAuthToken({
      userId: student.id,
      isInstructor: false,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + JWT_LIFETIME_SECONDS,
    }, env.APP_SECRET);
    const consent = await env.DB.prepare(`
      SELECT 1
      FROM "CourseConsent"
      WHERE "courseId" = ? AND "studentId" = ?
      LIMIT 1
    `).bind(courseId, student.id).first();
    const path = consent || !course.consentFormUrl?.trim()
      ? `/student/launch/${token}/${action}/${encodeURIComponent(objectId)}`
      : `/student/consent/${token}/${encodeURIComponent(courseId)}/${action}/${encodeURIComponent(objectId)}`;
    return launchPage(path);
  } catch (error) {
    return launchError(error);
  }
}

function xmlEscape(value) {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
  })[character]);
}

async function readBoundedText(response, limit) {
  const reader = response.body?.getReader();
  if (!reader) return '';
  const chunks = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > limit) {
      await reader.cancel();
      throw new Error('Outcome service response is too large');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

export async function postLtiGrade(ltiSessionInfo, consumerKey, consumerSecret, score, fetcher = fetch) {
  if (!Number.isFinite(score) || score < 0 || score > 1
    || !ltiSessionInfo?.lis_result_sourcedid
    || !validOutcomeUrl(ltiSessionInfo?.lis_outcome_service_url)) {
    throw new Error('Invalid LTI outcome parameters');
  }

  const serviceUrl = new URL(ltiSessionInfo.lis_outcome_service_url);
  const messageId = crypto.randomUUID();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<imsx_POXEnvelopeRequest xmlns="http://www.imsglobal.org/services/ltiv1p1/xsd/imsoms_v1p0">\n  <imsx_POXHeader>\n    <imsx_POXRequestHeaderInfo>\n      <imsx_version>V1.0</imsx_version>\n      <imsx_messageIdentifier>${messageId}</imsx_messageIdentifier>\n    </imsx_POXRequestHeaderInfo>\n  </imsx_POXHeader>\n  <imsx_POXBody>\n    <replaceResultRequest>\n      <resultRecord>\n        <sourcedGUID><sourcedId>${xmlEscape(ltiSessionInfo.lis_result_sourcedid)}</sourcedId></sourcedGUID>\n        <result><resultScore><language>en</language><textString>${score}</textString></resultScore></result>\n      </resultRecord>\n    </replaceResultRequest>\n  </imsx_POXBody>\n</imsx_POXEnvelopeRequest>`;

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomUUID();
  const bodyHash = encodeBase64(new Uint8Array(await crypto.subtle.digest(
    'SHA-1',
    new TextEncoder().encode(xml),
  )));
  const oauthParameters = [
    ['oauth_version', '1.0'],
    ['oauth_nonce', nonce],
    ['oauth_timestamp', timestamp],
    ['oauth_consumer_key', consumerKey],
    ['oauth_body_hash', bodyHash],
    ['oauth_signature_method', 'HMAC-SHA1'],
  ];
  const baseString = signatureBaseString(serviceUrl, 'POST', oauthParameters);
  const signingKey = `${oauthEncode(consumerSecret)}&`;
  const signature = encodeBase64(await hmacSha1(signingKey, baseString));
  const authorization = `OAuth realm="",${[
    ...oauthParameters,
    ['oauth_signature', signature],
  ].map(([key, value]) => `${key}="${oauthEncode(value)}"`).join(',')}`;

  const response = await fetcher(serviceUrl, {
    method: 'POST',
    headers: {
      authorization,
      'content-type': 'application/xml',
    },
    body: xml,
    signal: AbortSignal.timeout(8000),
  });
  const responseBody = await readBoundedText(response, OUTCOME_RESPONSE_BYTES);
  if (!response.ok) {
    throw new Error(`LTI outcome service returned HTTP ${response.status}`);
  }
  const envelope = /<(?:[\w.-]+:)?imsx_POXEnvelopeResponse\b[\s\S]*<\/(?:[\w.-]+:)?imsx_POXEnvelopeResponse\s*>/i.exec(responseBody)?.[0];
  const status = envelope
    ? /<(?:[\w.-]+:)?imsx_codeMajor\b[^>]*>\s*([^<]+)\s*<\/(?:[\w.-]+:)?imsx_codeMajor\s*>/i.exec(envelope)?.[1]
    : null;
  if (status?.trim().toLowerCase() !== 'success') {
    throw new Error('LTI outcome service rejected the grade');
  }
}
