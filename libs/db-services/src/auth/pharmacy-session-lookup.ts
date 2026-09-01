import type { AuthRepository } from './types.ts';

export function createPharmacySessionLookup(repository: AuthRepository) {
  return {
    async findByTokenHash(tokenHash: string) {
      const session = await repository.findSessionByTokenHash(tokenHash);
      if (!session || session.revokedAt) {
        return null;
      }
      const user = await repository.findUserById(session.userId);
      if (!user) {
        return null;
      }
      return {
        sessionId: session.sessionId,
        userId: user.userId,
        tenantId: session.tenantId,
        locationId: session.locationId,
        role: user.role,
        lastSeenAt: session.lastSeenAt,
        revokedAt: session.revokedAt,
      };
    },
  };
}
