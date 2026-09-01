export const ALWAYS_REACHABLE_KEYS = [
  'dashboard',
  'orders',
  'account',
  'subscription',
  'settings',
  'help-support',
  'refer-earn',
  'manage-users',
] as const;

export const FREE_PACKAGING_KEYS = [
  'pos-billing',
  'inventory',
  'purchases',
  'returns',
  'purchase-returns',
  'invoice-settings',
] as const;

export const PLAN_LABELS = {
  free: 'Free',
  starter: 'Starter',
  growth: 'Growth',
  pro: 'Pro',
} as const;

export type PlanId = keyof typeof PLAN_LABELS;

export const MIN_PLAN_FOR_MODULE: Record<string, PlanId> = {
  dashboard: 'free',
  'pos-billing': 'free',
  orders: 'free',
  inventory: 'free',
  purchases: 'free',
  returns: 'free',
  'purchase-returns': 'free',
  'invoice-settings': 'free',
  'manage-users': 'free',
  account: 'free',
  subscription: 'free',
  settings: 'free',
  'help-support': 'free',
  'refer-earn': 'free',
  prescriptions: 'starter',
  customers: 'starter',
  khata: 'starter',
  'statutory-registers': 'starter',
  employees: 'starter',
  'sales-ledger': 'growth',
  reports: 'growth',
  crm: 'growth',
  'ca-sharing': 'growth',
  'books-gst': 'growth',
  'stock-take': 'growth',
  'distributors-reorder': 'growth',
  offers: 'growth',
  expenses: 'growth',
  racks: 'growth',
  kiosk: 'pro',
};

export const MONTHLY_INR: Record<PlanId, number> = {
  free: 0,
  starter: 699,
  growth: 1499,
  pro: 2999,
};

export function isAlwaysReachable(moduleKey: string): boolean {
  return (ALWAYS_REACHABLE_KEYS as readonly string[]).includes(moduleKey);
}

export function freeModules(): Record<string, boolean> {
  const modules: Record<string, boolean> = {};
  for (const key of Object.keys(MIN_PLAN_FOR_MODULE)) {
    modules[key] =
      (ALWAYS_REACHABLE_KEYS as readonly string[]).includes(key) ||
      (FREE_PACKAGING_KEYS as readonly string[]).includes(key);
  }
  return modules;
}
