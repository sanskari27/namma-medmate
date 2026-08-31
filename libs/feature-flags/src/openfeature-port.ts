export interface FlagProvider {
  getBoolean(key: string, defaultValue: boolean): Promise<boolean>;
}

export class MemoryFlagProvider implements FlagProvider {
  constructor(private readonly flags: Record<string, boolean> = {}) {}

  async getBoolean(key: string, defaultValue: boolean): Promise<boolean> {
    return this.flags[key] ?? defaultValue;
  }
}

export function createFeatureFlags(provider: FlagProvider) {
  return {
    isEnabled: (key: string, defaultValue = false) => provider.getBoolean(key, defaultValue),
  };
}
