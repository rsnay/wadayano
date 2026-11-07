import { AUTH_TOKEN } from './constants';

export class ApiError extends Error {
  constructor(status, code) {
    super(code);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export async function apiRequest(path, { method = 'GET', body, signal } = {}) {
  const headers = new Headers();
  const token = localStorage.getItem(AUTH_TOKEN);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  const options = {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  };
  if (signal) {
    options.signal = signal;
  }
  const response = await fetch(path, options);

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new ApiError(response.status, 'unexpected_response');
  }

  const result = await response.json();
  if (!response.ok) {
    throw new ApiError(response.status, result.error || 'request_failed');
  }

  return result;
}
