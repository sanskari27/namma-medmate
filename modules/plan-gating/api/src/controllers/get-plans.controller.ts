import { buildSuccess } from '@namma-medmate/response-envelope';
import { GST_NOTE, GST_NOTE_I18N, PLAN_CATALOGUE } from '../catalogue.ts';
import { requirePharmacyOrHq } from '../auth/principal.ts';
import type { AuthedRequest } from '../http/parse-auth.ts';

export function createGetPlansController() {
  return async function getPlans(input: AuthedRequest) {
    requirePharmacyOrHq(input.principal);
    return buildSuccess({
      gst_note: GST_NOTE,
      i18n_key_gst: GST_NOTE_I18N,
      items: PLAN_CATALOGUE.map((item) => ({
        plan: item.plan,
        monthly_inr: item.monthly_inr,
        annual_savings_copy: item.annual_savings_copy,
        seats_limit: item.seats_limit,
        label_i18n: item.label_i18n,
      })),
    });
  };
}
