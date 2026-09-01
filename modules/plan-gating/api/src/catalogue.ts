export const MODULE_KEYS = [
  'dashboard',
  'pos-billing',
  'orders',
  'inventory',
  'purchases',
  'returns',
  'purchase-returns',
  'invoice-settings',
  'manage-users',
  'account',
  'subscription',
  'settings',
  'help-support',
  'refer-earn',
  'prescriptions',
  'customers',
  'khata',
  'statutory-registers',
  'employees',
  'sales-ledger',
  'reports',
  'crm',
  'ca-sharing',
  'books-gst',
  'stock-take',
  'distributors-reorder',
  'offers',
  'expenses',
  'racks',
  'kiosk',
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

export const PLANS = ['free', 'starter', 'growth', 'pro'] as const;
export type PlanId = (typeof PLANS)[number];

export const STAFF_ROLES = ['Owner', 'Manager', 'Pharmacist', 'Cashier'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const ALWAYS_REACHABLE_KEYS = [
  'dashboard',
  'orders',
  'account',
  'subscription',
  'settings',
  'help-support',
  'refer-earn',
  'manage-users',
] as const satisfies readonly ModuleKey[];

export const FREE_PACKAGING_KEYS = [
  'pos-billing',
  'inventory',
  'purchases',
  'returns',
  'purchase-returns',
  'invoice-settings',
] as const satisfies readonly ModuleKey[];

export const STARTER_KEYS = [
  'prescriptions',
  'customers',
  'khata',
  'statutory-registers',
  'employees',
] as const satisfies readonly ModuleKey[];

export const GROWTH_KEYS = [
  'sales-ledger',
  'reports',
  'crm',
  'ca-sharing',
  'books-gst',
  'stock-take',
  'distributors-reorder',
  'offers',
  'expenses',
  'racks',
] as const satisfies readonly ModuleKey[];

export const PRO_KEYS = ['kiosk'] as const satisfies readonly ModuleKey[];

const OVERRIDE_FALSE_PROTECTED = new Set<ModuleKey>([
  ...ALWAYS_REACHABLE_KEYS,
  ...FREE_PACKAGING_KEYS,
]);

export interface PlanCatalogueItem {
  plan: PlanId;
  monthly_inr: number;
  annual_savings_copy: string | null;
  seats_limit: number | null;
  label_i18n: string;
}

export const PLAN_CATALOGUE: readonly PlanCatalogueItem[] = [
  {
    plan: 'free',
    monthly_inr: 0,
    annual_savings_copy: null,
    seats_limit: 2,
    label_i18n: 'planGating.plans.free.name',
  },
  {
    plan: 'starter',
    monthly_inr: 699,
    annual_savings_copy: '~5% off',
    seats_limit: 2,
    label_i18n: 'planGating.plans.starter.name',
  },
  {
    plan: 'growth',
    monthly_inr: 1499,
    annual_savings_copy: '~15% off',
    seats_limit: 5,
    label_i18n: 'planGating.plans.growth.name',
  },
  {
    plan: 'pro',
    monthly_inr: 2999,
    annual_savings_copy: '~20% off',
    seats_limit: null,
    label_i18n: 'planGating.plans.pro.name',
  },
];

export const GST_NOTE = '18% GST applied at checkout';
export const GST_NOTE_I18N = 'planGating.plans.gstNote';

const PLAN_RANK: Record<PlanId, number> = {
  free: 0,
  starter: 1,
  growth: 2,
  pro: 3,
};

export function isModuleKey(value: string): value is ModuleKey {
  return (MODULE_KEYS as readonly string[]).includes(value);
}

export function isStaffRole(value: string): value is StaffRole {
  return (STAFF_ROLES as readonly string[]).includes(value);
}

const CATALOGUE_BY_PLAN = Object.fromEntries(
  PLAN_CATALOGUE.map((item) => [item.plan, item]),
) as Record<PlanId, PlanCatalogueItem>;

export function catalogueItem(plan: PlanId): PlanCatalogueItem {
  return CATALOGUE_BY_PLAN[plan];
}

export function moduleUnlockedForPlan(plan: PlanId, key: ModuleKey): boolean {
  if ((ALWAYS_REACHABLE_KEYS as readonly ModuleKey[]).includes(key)) {
    return true;
  }
  if ((FREE_PACKAGING_KEYS as readonly ModuleKey[]).includes(key)) {
    return true;
  }
  if ((STARTER_KEYS as readonly ModuleKey[]).includes(key)) {
    return PLAN_RANK[plan] >= PLAN_RANK.starter;
  }
  if ((GROWTH_KEYS as readonly ModuleKey[]).includes(key)) {
    return PLAN_RANK[plan] >= PLAN_RANK.growth;
  }
  return PLAN_RANK[plan] >= PLAN_RANK.pro;
}

export function modulesForPlan(plan: PlanId): Record<ModuleKey, boolean> {
  const modules = {} as Record<ModuleKey, boolean>;
  for (const key of MODULE_KEYS) {
    modules[key] = moduleUnlockedForPlan(plan, key);
  }
  return modules;
}

export function minimumPlanForModule(key: ModuleKey): PlanId {
  if ((ALWAYS_REACHABLE_KEYS as readonly ModuleKey[]).includes(key)) {
    return 'free';
  }
  if ((FREE_PACKAGING_KEYS as readonly ModuleKey[]).includes(key)) {
    return 'free';
  }
  if ((STARTER_KEYS as readonly ModuleKey[]).includes(key)) {
    return 'starter';
  }
  if ((GROWTH_KEYS as readonly ModuleKey[]).includes(key)) {
    return 'growth';
  }
  return 'pro';
}

export function isOverrideFalseProtected(key: ModuleKey): boolean {
  return OVERRIDE_FALSE_PROTECTED.has(key);
}

const MANAGER_TRUE: ReadonlySet<ModuleKey> = new Set([
  'dashboard',
  'pos-billing',
  'orders',
  'prescriptions',
  'khata',
  'inventory',
  'purchases',
  'racks',
  'distributors-reorder',
  'reports',
  'crm',
  'account',
  'help-support',
]);

const PHARMACIST_TRUE: ReadonlySet<ModuleKey> = new Set([
  'pos-billing',
  'orders',
  'prescriptions',
  'inventory',
  'racks',
  'crm',
  'account',
  'help-support',
]);

const CASHIER_TRUE: ReadonlySet<ModuleKey> = new Set([
  'pos-billing',
  'orders',
  'khata',
  'account',
  'help-support',
]);

function mapFor(trueKeys: ReadonlySet<ModuleKey>): Record<ModuleKey, boolean> {
  const modules = {} as Record<ModuleKey, boolean>;
  for (const key of MODULE_KEYS) {
    modules[key] = trueKeys.has(key);
  }
  return modules;
}

export function roleDefaults(): Record<StaffRole, Record<ModuleKey, boolean>> {
  const owner = {} as Record<ModuleKey, boolean>;
  for (const key of MODULE_KEYS) {
    owner[key] = true;
  }
  return {
    Owner: owner,
    Manager: mapFor(MANAGER_TRUE),
    Pharmacist: mapFor(PHARMACIST_TRUE),
    Cashier: mapFor(CASHIER_TRUE),
  };
}

export function roleAllows(
  role: StaffRole,
  key: ModuleKey,
  ticks: Record<string, boolean>,
): boolean {
  if (role === 'Owner') {
    return true;
  }
  if (Object.prototype.hasOwnProperty.call(ticks, key)) {
    return ticks[key] === true;
  }
  return roleDefaults()[role][key];
}
