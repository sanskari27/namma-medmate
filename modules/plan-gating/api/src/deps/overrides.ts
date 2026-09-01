export interface OverrideReader {
  getOverrides(tenantId: string): Promise<Record<string, boolean>>;
}

export class MemoryOverrideReader implements OverrideReader {
  constructor(private readonly byTenant = new Map<string, Record<string, boolean>>()) {}

  fail = false;

  seed(tenantId: string, overrides: Record<string, boolean>): void {
    this.byTenant.set(tenantId, overrides);
  }

  async getOverrides(tenantId: string): Promise<Record<string, boolean>> {
    if (this.fail) {
      throw new Error('overrides unavailable');
    }
    return { ...(this.byTenant.get(tenantId) ?? {}) };
  }
}
