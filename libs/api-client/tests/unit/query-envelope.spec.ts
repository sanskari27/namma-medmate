import { describe, expect, it } from 'vitest';
import { queryEnvelope } from '../../src/query-envelope.ts';

describe('queryEnvelope', () => {
  it('defaults to status 500 when the client returns an error without a response', async () => {
    await expect(
      queryEnvelope(async () => ({
        error: { message: 'broken' },
        data: undefined,
        response: undefined,
      })),
    ).resolves.toEqual({
      error: {
        status: 500,
        data: { message: 'broken' },
      },
    });
  });

  it('returns unwrapped data from a successful envelope', async () => {
    await expect(
      queryEnvelope(async () => ({
        data: { data: { authenticated: true, sub: 'user-1' } },
      })),
    ).resolves.toEqual({
      data: { authenticated: true, sub: 'user-1' },
    });
  });

  it('treats missing data as an error even when error is empty', async () => {
    await expect(
      queryEnvelope(async () => ({
        error: undefined,
        data: undefined,
        response: { status: 502 },
      })),
    ).resolves.toEqual({
      error: {
        status: 502,
        data: undefined,
      },
    });
  });

  it('maps thrown failures to a 500 envelope error', async () => {
    await expect(
      queryEnvelope(async () => {
        throw new Error('offline');
      }),
    ).resolves.toEqual({
      error: { status: 500, data: 'request_unavailable' },
    });
  });
});
