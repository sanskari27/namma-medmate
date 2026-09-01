export type PlanId = 'free' | 'starter' | 'growth' | 'pro';

export interface ModuleEntitlements {
  plan: PlanId;
  modules: Record<string, boolean>;
}

export interface PlanGatingClient {
  getEntitlements(accessToken: string, locationId: string): Promise<ModuleEntitlements>;
}

export class MemoryPlanGatingClient implements PlanGatingClient {
  plan: PlanId = 'starter';
  modules: Record<string, boolean> = { employees: true, 'statutory-registers': true };
  fail = false;

  async getEntitlements(_accessToken: string, _locationId: string): Promise<ModuleEntitlements> {
    if (this.fail) {
      throw new Error('plan-gating unavailable');
    }
    return { plan: this.plan, modules: { ...this.modules } };
  }
}
