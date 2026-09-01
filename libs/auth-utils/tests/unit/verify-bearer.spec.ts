// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { UnauthorizedError } from '@namma-medmate/error-handling';
import {
  hashBearerToken,
  PHARMACY_SESSION_PREFIX,
  SESSION_IDLE_MS,
  verifyBearer,
  type PharmacySessionLookup,
} from '../../src/index.ts';

const oidc = {
  issuer: 'http://localhost:8081',
  audience: 'namma-medmate-dispensary',
  jwksUri: 'http://localhost:8081/jwks.json',
};

const valid = {
  sessionId: 'sess-1',
  userId: 'user-111',
  tenantId: '8f1c0a7e-2b3d-4e5f-8a90-123456789abc',
  locationId: '1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809',
  role: 'owner' as const,
  lastSeenAt: new Date('2026-08-31T16:00:00.000Z'),
  revokedAt: null,
};

describe('verifyBearer', () => {
  it('maps a pharmacy session token through the lookup', async () => {
    const token = `${PHARMACY_SESSION_PREFIX}abc`;
    const lookup: PharmacySessionLookup = {
      async findByTokenHash(tokenHash) {
        expect(tokenHash).toBe(hashBearerToken(token));
        return valid;
      },
    };
    await expect(
      verifyBearer(token, {
        oidc,
        lookupPharmacySession: lookup,
        now: new Date('2026-08-31T16:30:00.000Z'),
      }),
    ).resolves.toMatchObject({
      sub: 'user-111',
      principalType: 'pharmacy',
      role: 'owner',
      tenantId: valid.tenantId,
      locationId: valid.locationId,
    });
  });

  it('rejects missing lookup, revoked, idle, or unknown pharmacy tokens', async () => {
    const token = `${PHARMACY_SESSION_PREFIX}abc`;
    await expect(verifyBearer(token, { oidc })).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(
      verifyBearer(token, {
        oidc,
        lookupPharmacySession: { findByTokenHash: async () => null },
      }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(
      verifyBearer(token, {
        oidc,
        lookupPharmacySession: {
          findByTokenHash: async () => ({ ...valid, revokedAt: new Date() }),
        },
      }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(
      verifyBearer(token, {
        oidc,
        lookupPharmacySession: { findByTokenHash: async () => valid },
        now: new Date(valid.lastSeenAt.getTime() + SESSION_IDLE_MS + 1),
      }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(verifyBearer('eyJhbGciOiJub25lIn0.e30.', { oidc })).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });
});
