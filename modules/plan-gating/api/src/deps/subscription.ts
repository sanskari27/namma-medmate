import type { PlanId } from '../catalogue.ts';

export interface SaasSubscription {
  plan: PlanId;
  status: string;
  billing_interval?: string;
  expires_at?: string;
}

export interface SubscriptionReader {
  getSubscription(tenantId: string): Promise<SaasSubscription | undefined>;
}

export class MemorySubscriptionReader implements SubscriptionReader {
  constructor(private readonly byTenant = new Map<string, SaasSubscription>()) {}

  fail = false;

  seed(tenantId: string, subscription: SaasSubscription): void {
    this.byTenant.set(tenantId, subscription);
  }

  async getSubscription(tenantId: string): Promise<SaasSubscription | undefined> {
    if (this.fail) {
      throw new Error('saas-billing timeout');
    }
    return this.byTenant.get(tenantId);
  }
}
