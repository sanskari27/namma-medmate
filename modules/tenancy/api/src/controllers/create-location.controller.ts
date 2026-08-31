import type { TenancyRepository } from '@namma-medmate/db-services';
import { requireHq } from '../auth/principal.ts';
import { TenancyErrors } from '../errors.ts';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { parseUuid } from '../http/validate.ts';

export function createCreateLocationController(repository: TenancyRepository) {
  return async function createLocation(input: AuthedRequest): Promise<never> {
    requireHq(input.principal);
    const tenantId = parseUuid(input.req.params.tenant_id, 'tenant_id');
    const pharmacy = await repository.getPharmacyByTenantId(tenantId);
    if (!pharmacy) {
      throw TenancyErrors.pharmacyNotFound();
    }
    throw TenancyErrors.locationLimitV1();
  };
}
