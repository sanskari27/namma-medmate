import type { LocationRecord, TenancyRepository } from './types.ts';

export function getLocationForTenant(
  repository: TenancyRepository,
  tenantId: string,
): Promise<LocationRecord | undefined> {
  return repository.getLocationForTenant(tenantId);
}
