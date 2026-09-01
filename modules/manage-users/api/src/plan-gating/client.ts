export interface SeatEntitlements {
  plan: 'free' | 'starter' | 'growth' | 'pro';
  seatLimit: number | null;
}

export interface PlanGatingClient {
  getSeats(accessToken: string, locationId: string): Promise<SeatEntitlements>;
}

export class MemoryPlanGatingClient implements PlanGatingClient {
  plan: SeatEntitlements['plan'] = 'free';
  seatLimit: number | null = 2;
  fail = false;

  async getSeats(_accessToken: string, _locationId: string): Promise<SeatEntitlements> {
    if (this.fail) {
      throw new Error('plan-gating unavailable');
    }
    return { plan: this.plan, seatLimit: this.seatLimit };
  }
}
