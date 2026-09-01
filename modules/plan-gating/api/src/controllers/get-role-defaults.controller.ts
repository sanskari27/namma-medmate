import { buildSuccess } from '@namma-medmate/response-envelope';
import { roleDefaults } from '../catalogue.ts';
import { requirePharmacyOrHq } from '../auth/principal.ts';
import type { AuthedRequest } from '../http/parse-auth.ts';

export function createGetRoleDefaultsController() {
  return async function getRoleDefaults(input: AuthedRequest) {
    requirePharmacyOrHq(input.principal);
    return buildSuccess(roleDefaults());
  };
}
