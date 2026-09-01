import { createHttpClient } from '@namma-medmate/http-client';
import type { PlanGatingClient, SeatEntitlements } from './client.ts';

interface EntitlementsBody {
  data?: { effective_plan?: string; seatsLimit?: number | null };
}

export function createHttpPlanGatingClient(baseUrl: string): PlanGatingClient {
  const request = createHttpClient({
    retries: 0,
    fetchImpl: (input, init) => fetch(input, init),
  });
  return {
    async getSeats(accessToken: string, locationId: string): Promise<SeatEntitlements> {
      const response = await request(
        `${baseUrl.replace(/\/$/, '')}/plan-gating/entitlements?location_id=${encodeURIComponent(locationId)}`,
        { headers: { authorization: `Bearer ${accessToken}` } },
      );
      const body = (await response.json()) as EntitlementsBody;
      const plan = body.data?.effective_plan;
      const seatLimit = body.data?.seatsLimit ?? null;
      if (plan === 'free' || plan === 'starter' || plan === 'growth' || plan === 'pro') {
        return { plan, seatLimit };
      }
      return { plan: 'free', seatLimit: 2 };
    },
  };
}
