import { buildSuccess } from '@namma-medmate/response-envelope';
import { requireCatalogueReader } from '../auth/principal.ts';
import { TEMPLATE_CATALOGUE } from '../catalogue.ts';
import type { AuthedRequest } from '../http/parse-auth.ts';

export function createListTemplatesController() {
  return async function listTemplates(input: AuthedRequest) {
    requireCatalogueReader(input.principal);
    return buildSuccess({ items: [...TEMPLATE_CATALOGUE] });
  };
}
