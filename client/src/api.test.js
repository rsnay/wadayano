import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTH_TOKEN } from './constants';
import { ApiError, apiRequest } from './api';

describe('apiRequest', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends same-origin JSON requests with the stored bearer token', async () => {
    localStorage.setItem(AUTH_TOKEN, 'session-token');
    const fetchMock = vi.fn().mockResolvedValue({
      status: 201,
      ok: true,
      headers: { get: () => 'application/json; charset=utf-8' },
      json: async () => ({ id: 'event-1' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiRequest('/api/tracking/events', {
      method: 'POST',
      body: { action: 'STUDENT_REVIEW_CONCEPT', context: { concept: 'Algebra' } },
    })).resolves.toEqual({ id: 'event-1' });

    expect(fetchMock).toHaveBeenCalledWith('/api/tracking/events', {
      method: 'POST',
      headers: expect.any(Headers),
      body: JSON.stringify({
        action: 'STUDENT_REVIEW_CONCEPT',
        context: { concept: 'Algebra' },
      }),
    });
    const { headers } = fetchMock.mock.calls[0][1];
    expect(headers.get('authorization')).toBe('Bearer session-token');
    expect(headers.get('content-type')).toBe('application/json');
  });

  it('returns null for no-content responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 204,
      ok: true,
      headers: { get: () => null },
    }));

    await expect(apiRequest('/api/tracking/events', { method: 'POST', body: {} })).resolves.toBeNull();
  });

  it('exposes API error codes and statuses without logging response data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 401,
      ok: false,
      headers: { get: () => 'application/json' },
      json: async () => ({ error: 'unauthorized' }),
    }));

    await expect(apiRequest('/api/tracking/events')).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
      code: 'unauthorized',
    });
  });

  it('rejects non-JSON responses instead of treating SPA HTML as API data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      headers: { get: () => 'text/html' },
    }));

    await expect(apiRequest('/api/tracking/events')).rejects.toBeInstanceOf(ApiError);
  });
});
