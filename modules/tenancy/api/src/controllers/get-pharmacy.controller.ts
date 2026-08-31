import type { TenancyRepository } from '@namma-medmate/db-services';
import { buildSuccess } from '@namma-medmate/response-envelope';
import { requireHq } from '../auth/principal.ts';
import { TenancyErrors } from '../errors.ts';
import { toPharmacy } from '../http/mappers.ts';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { parseUuid } from '../http/validate.ts';

export function createGetPharmacyController(repository: TenancyRepository) {
  return async function getPharmacy(input: AuthedRequest) {
    requireHq(input.principal);
    const tenantId = parseUuid(input.req.params.tenant_id, 'tenant_id');
    const pharmacy = await repository.getPharmacyByTenantId(tenantId);
    if (!pharmacy) {
      throw TenancyErrors.pharmacyNotFound();
    }
    return buildSuccess(toPharmacy(pharmacy));
  };
}
