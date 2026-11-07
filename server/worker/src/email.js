import { HttpError } from './http.js';

const EMAIL_API_PATH = '/v2/email/outbound-emails';
const EMAIL_TIMEOUT_MS = 8000;

function bytesToHex(bytes) {
  return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256(value) {
  return bytesToHex(new Uint8Array(await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  )));
}

async function hmac(keyBytes, value) {
  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return new Uint8Array(await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(value),
  ));
}

function sesConfiguration(env, requirePublicBaseUrl = false) {
  const region = env.AWS_SES_REGION;
  const accessKey = env.AWS_SES_KEY;
  const secretKey = env.AWS_SES_SECRET;
  const from = env.AWS_SES_FROM_ADDRESS;
  const baseUrl = env.PUBLIC_BASE_URL;
  if (!region || !/^[a-z]{2}(?:-gov)?-[a-z]+-\d+$/.test(region)
    || !accessKey || !secretKey || !from || (requirePublicBaseUrl && !baseUrl)) {
    throw new HttpError(503, 'email_not_configured');
  }

  let publicUrl = null;
  if (baseUrl) {
    try {
      publicUrl = new URL(baseUrl);
    } catch {
      throw new HttpError(503, 'email_not_configured');
    }
    if (publicUrl.protocol !== 'https:' || publicUrl.username || publicUrl.password) {
      throw new HttpError(503, 'email_not_configured');
    }
  }
  return {
    region,
    accessKey,
    secretKey,
    from,
    publicUrl: publicUrl?.origin ?? null,
  };
}

export function requireEmailConfiguration(env, requirePublicBaseUrl = false) {
  return sesConfiguration(env, requirePublicBaseUrl);
}

function amzTimestamp(date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

export async function sendSesEmail(env, { to, subject, html, text }) {
  const configuration = sesConfiguration(env);
  if (typeof to !== 'string' || to.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)
    || typeof subject !== 'string' || !subject || subject.length > 200 || /[\r\n]/.test(subject)
    || typeof html !== 'string' || html.length > 100_000
    || typeof text !== 'string' || text.length > 100_000) {
    throw new HttpError(400, 'invalid_email');
  }

  const url = new URL(EMAIL_API_PATH, `https://email.${configuration.region}.amazonaws.com`);
  const payload = JSON.stringify({
    FromEmailAddress: configuration.from,
    Destination: { ToAddresses: [to] },
    Content: {
      Simple: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: {
          Html: { Data: html, Charset: 'UTF-8' },
          Text: { Data: text, Charset: 'UTF-8' },
        },
      },
    },
  });
  const date = new Date();
  const dateStamp = date.toISOString().slice(0, 10).replace(/-/g, '');
  const timestamp = amzTimestamp(date);
  const payloadHash = await sha256(payload);
  const securityToken = env.AWS_SES_SESSION_TOKEN;
  const canonicalHeaders = [
    'content-type:application/json',
    `host:${url.host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${timestamp}`,
    ...(securityToken ? [`x-amz-security-token:${securityToken}`] : []),
  ].join('\n') + '\n';
  const signedHeaders = [
    'content-type',
    'host',
    'x-amz-content-sha256',
    'x-amz-date',
    ...(securityToken ? ['x-amz-security-token'] : []),
  ].join(';');
  const canonicalRequest = [
    'POST',
    url.pathname,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');
  const scope = `${dateStamp}/${configuration.region}/ses/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    timestamp,
    scope,
    await sha256(canonicalRequest),
  ].join('\n');
  const dateKey = await hmac(
    new TextEncoder().encode(`AWS4${configuration.secretKey}`),
    dateStamp,
  );
  const regionKey = await hmac(dateKey, configuration.region);
  const serviceKey = await hmac(regionKey, 'ses');
  const signingKey = await hmac(serviceKey, 'aws4_request');
  const signature = bytesToHex(await hmac(signingKey, stringToSign));
  const authorization = `AWS4-HMAC-SHA256 Credential=${configuration.accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const headers = {
    authorization,
    'content-type': 'application/json',
    host: url.host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': timestamp,
  };
  if (securityToken) {
    headers['x-amz-security-token'] = securityToken;
  }

  const response = await (env.SES_FETCH ?? fetch)(url, {
    method: 'POST',
    headers,
    body: payload,
    signal: AbortSignal.timeout(EMAIL_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new HttpError(502, 'email_delivery_failed');
  }
}
