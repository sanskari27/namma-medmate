import type { TenancyRepository } from '@namma-medmate/db-services';
import type { Logger } from '@namma-medmate/logger';
import { buildSuccess } from '@namma-medmate/response-envelope';
import { requireHq } from '../auth/principal.ts';
import { TenancyErrors } from '../errors.ts';
import { toCreatedPharmacy } from '../http/mappers.ts';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { parseDisplayName } from '../http/validate.ts';

export function createCreatePharmacyController(repository: TenancyRepository, logger: Logger) {
  return async function createPharmacy(input: AuthedRequest) {
    requireHq(input.principal);
    const body = (input.req.body ?? {}) as Record<string, unknown>;
    const displayName = parseDisplayName(body.display_name);
    if (body.gst_dealer_type !== 'regular' || body.business_type !== 'retail') {
      throw TenancyErrors.validationFailed(
        'Only regular GST dealers and retail chemists are allowed',
      );
    }
    const created = await repository.createPharmacyWithLocation({
      displayName,
      gstDealerType: 'regular',
      businessType: 'retail',
    });
    logger.info('PharmacyCreated', {
      tenant_id: created.tenantId,
      location_id: created.location.locationId,
    });
    return buildSuccess(toCreatedPharmacy(created));
  };
}
