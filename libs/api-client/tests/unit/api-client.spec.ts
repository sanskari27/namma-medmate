import { describe, expect, it, vi } from 'vitest';
import { createApiClient } from '../../src/index.ts';

describe('createApiClient', () => {
  it('injects a bearer token when provided', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    const client = createApiClient({
      baseUrl: 'http://localhost:3001',
      getAccessToken: () => 'token-1',
      fetchImpl,
    });
    await client.GET('/auth/session', undefined as never);
    const init = fetchImpl.mock.calls[0]?.[1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.get('Authorization')).toBe('Bearer token-1');
  });

  it('omits authorization when getAccessToken returns undefined', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    const client = createApiClient({
      baseUrl: 'http://localhost:3001',
      getAccessToken: () => undefined,
      fetchImpl,
    });
    await client.GET('/auth/session', undefined as never);
    const init = fetchImpl.mock.calls[0]?.[1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.get('Authorization')).toBeNull();
  });

  it('uses global fetch when fetchImpl is omitted', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    const original = globalThis.fetch;
    globalThis.fetch = fetchImpl as typeof fetch;
    try {
      const client = createApiClient({ baseUrl: 'http://localhost:3001' });
      await client.GET('/auth/session', undefined as never);
      expect(fetchImpl).toHaveBeenCalled();
    } finally {
      globalThis.fetch = original;
    }
  });
});
