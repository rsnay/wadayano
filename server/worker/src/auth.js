import { HttpError } from './http.js';

function encodeBase64Url(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function decodeBase64Url(value) {
  if (!/^[\w-]+$/.test(value)) {
    throw new Error('Invalid JWT segment');
  }
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

export async function signAuthToken(payload, secret) {
  if (!secret) {
    throw new HttpError(503, 'authentication_not_configured');
  }

  const header = encodeBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = encodeBase64Url(JSON.stringify(payload));
  const unsigned = `${header}.${body}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = new Uint8Array(await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(unsigned),
  ));
  let binary = '';
  for (const byte of signature) {
    binary += String.fromCharCode(byte);
  }
  const encodedSignature = btoa(binary)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${unsigned}.${encodedSignature}`;
}

export async function authenticateRequest(request, secret) {
  const authorization = request.headers.get('authorization') || '';
  const match = /^Bearer ([^\s]+)$/.exec(authorization);
  if (!match || match[1].length > 4096) {
    throw new HttpError(401, 'unauthorized');
  }
  if (!secret) {
    throw new HttpError(503, 'authentication_not_configured');
  }

  try {
    const parts = match[1].split('.');
    if (parts.length !== 3) throw new Error('Invalid JWT');
    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const header = JSON.parse(new TextDecoder().decode(decodeBase64Url(encodedHeader)));
    const payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(encodedPayload)));
    const now = Math.floor(Date.now() / 1000);
    if (header.alg !== 'HS256'
      || typeof payload.userId !== 'string'
      || payload.userId.length === 0
      || typeof payload.isInstructor !== 'boolean'
      || (payload.exp !== undefined && typeof payload.exp !== 'number')
      || (payload.nbf !== undefined && typeof payload.nbf !== 'number')
      || (typeof payload.exp === 'number' && payload.exp <= now)
      || (typeof payload.nbf === 'number' && payload.nbf > now)) {
      throw new Error('Invalid JWT claims');
    }

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      decodeBase64Url(encodedSignature),
      new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
    );
    if (!valid) throw new Error('Invalid JWT signature');
    return payload;
  } catch {
    throw new HttpError(401, 'unauthorized');
  }
}

export async function requireRole(request, env, role) {
  const user = await authenticateRequest(request, env.APP_SECRET);
  if ((role === 'instructor' && !user.isInstructor)
    || (role === 'student' && user.isInstructor)) {
    throw new HttpError(403, 'forbidden');
  }
  return user;
}
