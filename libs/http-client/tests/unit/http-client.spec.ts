import { describe, expect, it, vi } from 'vitest';
import { createHttpClient, HttpClientError } from '../../src/index.ts';

describe('createHttpClient', () => {
  it('uses default fetch and retry settings', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }));
    const original = globalThis.fetch;
    globalThis.fetch = fetchImpl as typeof fetch;
    try {
      const request = createHttpClient();
      expect((await request('http://example.test')).status).toBe(200);
    } finally {
      globalThis.fetch = original;
    }
  });

  it('returns a successful response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }));
    const request = createHttpClient({ fetchImpl, retries: 0 });
    const response = await request('http://example.test');
    expect(await response.text()).toBe('ok');
  });

  it('retries 5xx responses then succeeds', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response('nope', { status: 503 }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));
    const request = createHttpClient({ fetchImpl, retries: 1, retryDelayMs: 1 });
    expect((await request('http://example.test')).status).toBe(200);
  });

  it('throws on non-retryable 4xx', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('nope', { status: 404 }));
    const request = createHttpClient({ fetchImpl, retries: 0 });
    await expect(request('http://example.test')).rejects.toBeInstanceOf(HttpClientError);
  });

  it('retries transport failures then throws', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('offline'));
    const request = createHttpClient({ fetchImpl, retries: 1, retryDelayMs: 1, timeoutMs: 20 });
    await expect(request('http://example.test')).rejects.toBeInstanceOf(HttpClientError);
  });
});
