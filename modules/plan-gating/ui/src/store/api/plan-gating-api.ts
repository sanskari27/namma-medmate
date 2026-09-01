import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { createApiClient, queryEnvelope } from '@namma-medmate/api-client';

export interface Entitlements {
  tenant_id: string;
  location_id: string;
  plan: 'free' | 'starter' | 'growth' | 'pro';
  effective_plan: 'free' | 'starter' | 'growth' | 'pro';
  status: 'active' | 'expired';
  seatsLimit: number | null;
  seatsUsed: number;
  seats_used_unknown?: boolean;
  modules: Record<string, boolean>;
  overrides: Record<string, boolean>;
}

export interface PaywallData {
  module_key: string;
  unlocked: boolean;
  required_plan: 'free' | 'starter' | 'growth' | 'pro';
  required_plan_label_i18n: string;
  monthly_inr: number;
  gst_note: string;
  title_i18n: string;
  body_i18n: string;
}

export interface PlanGatingApiContext {
  baseUrl: string;
  getAccessToken?: () => string | undefined | Promise<string | undefined>;
  getLocationId?: () => string | undefined;
  fetchImpl?: typeof fetch;
}

export const planGatingApi = createApi({
  reducerPath: 'planGatingApi',
  baseQuery: fakeBaseQuery(),
  endpoints: (builder) => ({
    getEntitlements: builder.query<Entitlements, void>({
      async queryFn(_arg, api) {
        const extra = api.extra as PlanGatingApiContext;
        const locationId = extra.getLocationId?.();
        return queryEnvelope(async () => {
          const client = createApiClient(extra);
          return client.GET('/plan-gating/entitlements', {
            params: {
              header: { authorization: 'Bearer session' },
              query: { location_id: locationId },
            },
          });
        });
      },
    }),
    getPaywall: builder.query<PaywallData, string>({
      async queryFn(moduleKey, api) {
        const extra = api.extra as PlanGatingApiContext;
        const locationId = extra.getLocationId?.();
        return queryEnvelope(async () => {
          const client = createApiClient(extra);
          return client.GET('/plan-gating/paywall', {
            params: {
              header: { authorization: 'Bearer session' },
              query: { module_key: moduleKey, location_id: locationId },
            },
          });
        });
      },
    }),
  }),
});

export const { useGetEntitlementsQuery, useGetPaywallQuery } = planGatingApi;
