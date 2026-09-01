import type { StoryScenario } from '@namma-medmate/story-generator';
import { freeModules } from '../packaging.ts';
import type { Entitlements } from '../store/api/plan-gating-api.ts';

const tenant = '8f1c0a7e-2b3d-4e5f-8a90-123456789abc';
const location = '1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809';

function entitlements(
  overrides: Partial<Entitlements> & { modules?: Record<string, boolean> },
): Entitlements {
  return {
    tenant_id: tenant,
    location_id: location,
    plan: 'free',
    effective_plan: 'free',
    status: 'active',
    seatsLimit: 2,
    seatsUsed: 0,
    modules: freeModules(),
    overrides: {},
    ...overrides,
  };
}

const expiredGrowth = entitlements({
  plan: 'growth',
  effective_plan: 'free',
  status: 'expired',
  seatsLimit: 2,
  modules: { ...freeModules(), reports: false, kiosk: false },
});

export const planGateScenarios = [
  {
    id: 'orders-unlocked',
    title: 'Orders unlocked',
    description: 'Always-reachable Orders has no paywall on Free.',
    props: {
      moduleKey: 'orders',
      skipQuery: true,
      children: 'Orders board',
    },
    preloadedState: { entitlements: { status: 'ready', data: entitlements({}) } },
  },
  {
    id: 'kiosk-locked',
    title: 'Kiosk locked',
    description: 'Opening Kiosk on Free shows the Pro paywall.',
    props: { moduleKey: 'kiosk', skipQuery: true, children: 'Kiosk' },
    preloadedState: { entitlements: { status: 'ready', data: entitlements({}) } },
  },
  {
    id: 'inventory-unlocked',
    title: 'Inventory unlocked',
    description: 'Inventory stays usable when Growth is expired.',
    props: { moduleKey: 'inventory', skipQuery: true, children: 'Inventory list' },
    preloadedState: { entitlements: { status: 'ready', data: expiredGrowth } },
  },
  {
    id: 'reports-locked',
    title: 'Reports locked',
    description: 'Reports paywall after Growth expires names Growth at 1499.',
    props: { moduleKey: 'reports', skipQuery: true, children: 'Reports' },
    preloadedState: { entitlements: { status: 'ready', data: expiredGrowth } },
  },
] as const satisfies readonly StoryScenario[];

export const paywallScenarios = [
  {
    id: 'kiosk-pro',
    title: 'Kiosk Pro paywall',
    description: 'Unlock Pro at 2999 plus GST at checkout.',
    props: { requiredPlan: 'pro', monthlyInr: 2999 },
  },
  {
    id: 'reports-growth',
    title: 'Reports Growth paywall',
    description: 'Unlock Growth at 1499 plus GST at checkout.',
    props: { requiredPlan: 'growth', monthlyInr: 1499 },
  },
] as const satisfies readonly StoryScenario[];

export const navLockScenarios = [
  {
    id: 'locked',
    title: 'Locked nav icon',
    description: 'Lock icon for a plan-locked sidebar item.',
    props: { locked: true },
  },
  {
    id: 'unlocked',
    title: 'Unlocked nav icon',
    description: 'No icon when the module is unlocked.',
    props: { locked: false },
  },
] as const satisfies readonly StoryScenario[];
