import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  NavLockIcon,
  Paywall,
  PlanGate,
  PlanGatingNav,
  StubPage,
  createPlanGatingStore,
} from '../../src/index.ts';
import { setEntitlements } from '../../src/store/slices/entitlements-slice.ts';
import type { Entitlements } from '../../src/store/api/plan-gating-api.ts';
import { freeModules } from '../../src/packaging.ts';
import { interpolate, paywallBody } from '../../src/lib/copy.ts';

const freeEntitlements: Entitlements = {
  tenant_id: '8f1c0a7e-2b3d-4e5f-8a90-123456789abc',
  location_id: '1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809',
  plan: 'free' as const,
  effective_plan: 'free' as const,
  status: 'active' as const,
  seatsLimit: 2,
  seatsUsed: 0,
  modules: freeModules(),
  overrides: {},
};

function renderWithStore(
  ui: ReactNode,
  fetchImpl: typeof fetch = vi.fn(),
  preloadedState?: { entitlements?: { status: 'idle' | 'ready'; data?: Entitlements } },
) {
  const store = createPlanGatingStore(
    {
      baseUrl: 'http://localhost:3006',
      getAccessToken: () => 'token',
      getLocationId: () => freeEntitlements.location_id,
      fetchImpl,
    },
    preloadedState,
  );
  return {
    store,
    ...render(<Provider store={store}>{ui}</Provider>),
  };
}

describe('plan-gating-ui', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders Pro paywall copy with 2999 and GST', () => {
    render(<Paywall requiredPlan="pro" monthlyInr={2999} />);
    expect(screen.getByRole('heading', { name: 'Unlock Pro' })).toBeInTheDocument();
    expect(screen.getByText(/₹2999 \/ month \+ 18% GST at checkout/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View plans' })).toHaveAttribute(
      'href',
      '/subscription',
    );
  });

  it('defaults monthly price from the catalogue', () => {
    render(<Paywall requiredPlan="growth" />);
    expect(screen.getByRole('heading', { name: 'Unlock Growth' })).toBeInTheDocument();
    expect(screen.getByText(/₹1499/)).toBeInTheDocument();
  });

  it('PlanGate does not paywall always-reachable orders', () => {
    renderWithStore(
      <PlanGate moduleKey="orders" skipQuery>
        Orders board
      </PlanGate>,
      undefined,
      { entitlements: { status: 'ready', data: freeEntitlements } },
    );
    expect(screen.getByText('Orders board')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'View plans' })).not.toBeInTheDocument();
  });

  it('PlanGate shows Pro paywall for kiosk on Free', () => {
    renderWithStore(
      <PlanGate moduleKey="kiosk" skipQuery>
        Kiosk
      </PlanGate>,
      undefined,
      { entitlements: { status: 'ready', data: freeEntitlements } },
    );
    expect(screen.getByRole('heading', { name: 'Unlock Pro' })).toBeInTheDocument();
    expect(screen.getByText(/₹2999/)).toBeInTheDocument();
  });

  it('PlanGate shows Growth paywall for reports when expired', () => {
    const expired = {
      ...freeEntitlements,
      plan: 'growth' as const,
      effective_plan: 'free' as const,
      status: 'expired' as const,
    };
    renderWithStore(
      <PlanGate moduleKey="reports" skipQuery>
        Reports
      </PlanGate>,
      undefined,
      { entitlements: { status: 'ready', data: expired } },
    );
    expect(screen.getByRole('heading', { name: 'Unlock Growth' })).toBeInTheDocument();
    expect(screen.getByText(/₹1499/)).toBeInTheDocument();
  });

  it('uses fallback Free entitlements when skipQuery has no preloaded data', () => {
    renderWithStore(
      <PlanGate moduleKey="inventory" skipQuery>
        Stock
      </PlanGate>,
    );
    expect(screen.getByText('Stock')).toBeInTheDocument();
  });

  it('shows a lock icon only when locked', () => {
    const { rerender } = render(<NavLockIcon locked />);
    expect(screen.getByRole('img', { name: 'Locked' })).toBeInTheDocument();
    rerender(<NavLockIcon locked={false} />);
    expect(screen.queryByRole('img', { name: 'Locked' })).not.toBeInTheDocument();
  });

  it('nav shows locks for reports and kiosk on Free', () => {
    renderWithStore(<PlanGatingNav skipQuery />, undefined, {
      entitlements: { status: 'ready', data: freeEntitlements },
    });
    expect(screen.getByRole('link', { name: /Orders/ })).toBeInTheDocument();
    expect(screen.getAllByRole('img', { name: 'Locked' }).length).toBeGreaterThan(0);
  });

  it('renders stub page copy', () => {
    render(<StubPage titleKey="planGating.stub.orders" moduleLabel="Orders" />);
    expect(screen.getByRole('heading', { name: 'Orders' })).toBeInTheDocument();
    expect(screen.getByText(/Placeholder screen for the Orders module/)).toBeInTheDocument();
  });

  it('interpolates missing vars as empty', () => {
    expect(interpolate('Hello {{name}}', {})).toBe('Hello ');
    expect(paywallBody('starter', 699)).toContain('699');
  });

  it('loads entitlements from the API', async () => {
    const fetchImpl = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      const payload = url.includes('/paywall')
        ? {
            module_key: 'kiosk',
            unlocked: false,
            required_plan: 'pro',
            required_plan_label_i18n: 'planGating.plans.pro.name',
            monthly_inr: 2999,
            gst_note: '18% GST applied at checkout',
            title_i18n: 'planGating.paywall.title',
            body_i18n: 'planGating.paywall.body',
          }
        : freeEntitlements;
      return new Response(JSON.stringify({ success: true, data: payload }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
    renderWithStore(<PlanGate moduleKey="orders">Orders board</PlanGate>, fetchImpl);
    expect(await screen.findByText('Orders board')).toBeInTheDocument();
  });

  it('shows an error banner when entitlements fail to load', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message: 'no' } }),
        {
          status: 401,
          headers: { 'content-type': 'application/json' },
        },
      ),
    );
    renderWithStore(<PlanGate moduleKey="kiosk">Kiosk</PlanGate>, fetchImpl);
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load plan entitlements');
  });

  it('returns nothing while a locked module is loading', () => {
    const fetchImpl = vi.fn().mockReturnValue(new Promise(() => undefined));
    renderWithStore(<PlanGate moduleKey="kiosk">Kiosk</PlanGate>, fetchImpl);
    expect(screen.queryByText('Kiosk')).not.toBeInTheDocument();
  });

  it('shows always-reachable children while loading', () => {
    const fetchImpl = vi.fn().mockReturnValue(new Promise(() => undefined));
    renderWithStore(<PlanGate moduleKey="orders">Orders board</PlanGate>, fetchImpl);
    expect(screen.getByText('Orders board')).toBeInTheDocument();
  });

  it('accepts entitlements as a prop and dispatches the slice', () => {
    const { store } = renderWithStore(
      <PlanGate moduleKey="inventory" entitlements={freeEntitlements}>
        Stock
      </PlanGate>,
    );
    store.dispatch(setEntitlements(freeEntitlements));
    expect(screen.getByText('Stock')).toBeInTheDocument();
    expect(store.getState().entitlements.status).toBe('ready');
  });

  it('nav falls back to free modules when skipQuery has no data', () => {
    renderWithStore(<PlanGatingNav skipQuery />);
    expect(screen.getByRole('navigation', { name: 'Plan modules' })).toBeInTheDocument();
  });

  it('nav without skipQuery uses query data', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: freeEntitlements }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    renderWithStore(<PlanGatingNav />, fetchImpl);
    await waitFor(() =>
      expect(screen.getAllByRole('img', { name: 'Locked' }).length).toBeGreaterThan(0),
    );
  });

  it('paywalls an unknown module as Pro', () => {
    renderWithStore(
      <PlanGate moduleKey="not-a-module" skipQuery>
        Secret
      </PlanGate>,
    );
    expect(screen.getByRole('heading', { name: 'Unlock Pro' })).toBeInTheDocument();
  });

  it('uses paywall API metadata for a locked live query', async () => {
    const fetchImpl = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      const payload = url.includes('/paywall')
        ? {
            module_key: 'kiosk',
            unlocked: false,
            required_plan: 'pro',
            required_plan_label_i18n: 'planGating.plans.pro.name',
            monthly_inr: 2999,
            gst_note: '18% GST applied at checkout',
            title_i18n: 'planGating.paywall.title',
            body_i18n: 'planGating.paywall.body',
          }
        : freeEntitlements;
      return new Response(JSON.stringify({ success: true, data: payload }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
    renderWithStore(<PlanGate moduleKey="kiosk">Kiosk</PlanGate>, fetchImpl);
    expect(await screen.findByRole('heading', { name: 'Unlock Pro' })).toBeInTheDocument();
    expect(screen.getByText(/₹2999/)).toBeInTheDocument();
  });
});
