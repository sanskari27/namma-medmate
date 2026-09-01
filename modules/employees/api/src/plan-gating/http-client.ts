import { createHttpClient } from '@namma-medmate/http-client';
import type { ModuleEntitlements, PlanGatingClient, PlanId } from './client.ts';

interface EntitlementsBody {
  data?: { effective_plan?: string; modules?: Record<string, boolean> };
}

export function createHttpPlanGatingClient(baseUrl: string): PlanGatingClient {
  const request = createHttpClient({
    retries: 0,
    fetchImpl: (input, init) => fetch(input, init),
  });
  return {
    async getEntitlements(accessToken: string, locationId: string): Promise<ModuleEntitlements> {
      const response = await request(
        `${baseUrl.replace(/\/$/, '')}/plan-gating/entitlements?location_id=${encodeURIComponent(locationId)}`,
        { headers: { authorization: `Bearer ${accessToken}` } },
      );
      const body = (await response.json()) as EntitlementsBody;
      const plan = body.data?.effective_plan;
      const modules = body.data?.modules ?? {};
      if (plan === 'free' || plan === 'starter' || plan === 'growth' || plan === 'pro') {
        return { plan: plan as PlanId, modules };
      }
      return { plan: 'free', modules };
    },
  };
}
