import { describe, expect, it } from 'vitest';
import type { AuthUser } from '@/store';
import type { DashboardView, DashboardWidget, OwnerDesk } from '@/services/dashboards';
import {
  apiStatusHint,
  clientPermittedDesks,
  defaultDesk,
  emptyCopy,
  formatAsOf,
  formatDay,
  formatDonutTooltip,
  formatHeldAt,
  formatPaise,
  formatQty,
  greetingForHour,
  isEmptyView,
  mapApiStatus,
  ownerWidgetList,
  pctOf,
  periodLabel,
  salesTrendPct,
  statusCopy,
  statusIcon,
  successCopy,
  uniqueDesks,
} from '../DashboardScreen.utils';

function staff(partial: Partial<AuthUser> = {}): AuthUser {
  return {
    userId: 'u1',
    displayName: 'Floor',
    role: 'pharmacy_staff',
    tenantId: 't1',
    pinSet: true,
    modules: [],
    ...partial,
  };
}

function okWidget<T>(data: T): DashboardWidget<T> {
  return {
    key: 'X',
    status: 'OK',
    asOf: '2026-09-06T06:00:00Z',
    href: '/x',
    error: null,
    data,
  };
}

describe('DashboardScreen.utils', () => {
  it('resolves permitted desks from modules and owner role', () => {
    expect(clientPermittedDesks(null)).toEqual([]);
    expect(clientPermittedDesks(staff({ role: 'pharmacy_owner' }))).toEqual([
      'owner',
      'cashier',
      'inventory',
      'accountant',
    ]);
    expect(clientPermittedDesks(staff({ modules: ['SALES'] }))).toEqual(['cashier']);
    expect(clientPermittedDesks(staff({ modules: ['INVENTORY'] }))).toEqual(['inventory']);
    expect(
      clientPermittedDesks(
        staff({
          modules: ['FINANCE'],
          roles: [{ id: 'r1', name: 'Accountant', code: 'accountant', kind: 'PREDEFINED' }],
        }),
      ),
    ).toEqual(['accountant']);
    expect(defaultDesk(staff({ role: 'pharmacy_owner' }))).toBe('owner');
    expect(defaultDesk(staff({ modules: ['SALES'] }))).toBe('cashier');
    expect(defaultDesk(staff())).toBeNull();
    expect(uniqueDesks(['owner', 'cashier', 'cashier', 'mystery'])).toEqual(['owner', 'cashier']);
  });

  it('detects empty desks and owner widget quiet states', () => {
    expect(isEmptyView('cashier', null)).toBe(false);
    expect(
      isEmptyView('cashier', {
        role: 'cashier',
        asOf: '2026-09-06',
        generatedAt: '2026-09-06T06:00:00Z',
        scope: 'branch',
        branchId: 'b1',
        branchName: 'Main',
        permittedRoles: ['cashier'],
        cashier: { todaySalesPaise: 0, todayBillCount: 0, holds: [], sources: { sales: '/pos', holds: '/pos' } },
      }),
    ).toBe(true);
    expect(
      isEmptyView('inventory', {
        role: 'inventory',
        asOf: '2026-09-06',
        generatedAt: '2026-09-06T06:00:00Z',
        scope: 'branch',
        branchId: 'b1',
        branchName: 'Main',
        permittedRoles: ['inventory'],
        inventory: {
          lowStock: [],
          pendingTransfers: [],
          pendingGrn: [],
          sources: { stock: '/inventory', transfers: '/inventory', grn: '/purchases' },
        },
      }),
    ).toBe(true);
    expect(
      isEmptyView('accountant', {
        role: 'accountant',
        asOf: '2026-09-06',
        generatedAt: '2026-09-06T06:00:00Z',
        scope: 'branch',
        branchId: 'b1',
        branchName: 'Main',
        permittedRoles: ['accountant'],
        accountant: {
          receivablesTotalPaise: 0,
          payablesTotalPaise: 0,
          expenseTotalPaise: 0,
          sources: { aging: '/aging', expenses: '/expenses' },
        },
      }),
    ).toBe(true);
    expect(
      isEmptyView('accountant', {
        role: 'accountant',
        asOf: '2026-09-06',
        generatedAt: '2026-09-06T06:00:00Z',
        scope: 'branch',
        branchId: 'b1',
        branchName: 'Main',
        permittedRoles: ['accountant'],
        accountant: {
          expenseTotalPaise: 0,
          agingHint: 'plan',
          sources: { aging: '/aging', expenses: '/expenses' },
        },
      }),
    ).toBe(false);

    const quietOwner: OwnerDesk = {
      asOf: '2026-09-06T06:00:00Z',
      todaySalesPaise: 0,
      todayBillCount: 0,
      branches: [],
      expenseTotalPaise: 0,
      lowStockCount: 0,
      sources: { sales: '/pos', stock: '/inventory', aging: '/aging', expenses: '/expenses' },
      sales: okWidget({ todaySalesPaise: 0, todayBillCount: 0, branches: [] }),
      lowStock: okWidget({ count: 0, items: [] }),
      expiry: okWidget({ count: 0, items: [] }),
      approvals: okWidget({ count: 0, items: [] }),
      receivables: okWidget({ totalPaise: 0, buckets: [] }),
      payables: okWidget({ totalPaise: 0, buckets: [] }),
      topProducts: okWidget({ count: 0, items: [] }),
      transfers: okWidget({ count: 0, items: [] }),
      compliance: okWidget({
        tenantStatus: 'ACTIVE',
        kycStatus: 'NONE',
        licenseDueCount: 0,
        licenses: [],
      }),
      openPurchaseOrders: okWidget({ count: 0, items: [] }),
    };
    expect(isEmptyView('owner', { role: 'owner', asOf: 'a', generatedAt: 'g', scope: 'branch', branchId: 'b1', branchName: 'Main', permittedRoles: ['owner'], owner: quietOwner })).toBe(true);
    expect(
      isEmptyView('owner', {
        role: 'owner',
        asOf: 'a',
        generatedAt: 'g',
        scope: 'branch',
        branchId: 'b1',
        branchName: 'Main',
        permittedRoles: ['owner'],
        owner: {
          ...quietOwner,
          compliance: {
            key: 'COMPLIANCE',
            status: 'FAILED',
            asOf: '2026-09-06T06:00:00Z',
            href: '/licenses',
            error: 'UNAVAILABLE',
            data: null,
          },
        },
      }),
    ).toBe(false);
    expect(
      isEmptyView('owner', {
        role: 'owner',
        asOf: 'a',
        generatedAt: 'g',
        scope: 'branch',
        branchId: 'b1',
        branchName: 'Main',
        permittedRoles: ['owner'],
        owner: {
          ...quietOwner,
          sales: undefined,
          lowStock: undefined,
          expiry: undefined,
          approvals: undefined,
          receivables: undefined,
          payables: undefined,
          topProducts: undefined,
          transfers: undefined,
          compliance: undefined,
          openPurchaseOrders: undefined,
        },
      }),
    ).toBe(true);
    expect(isEmptyView('cashier', { role: 'cashier', asOf: 'a', generatedAt: 'g', scope: 'branch', branchId: null, branchName: null, permittedRoles: [] } as DashboardView)).toBe(false);
    expect(ownerWidgetList(quietOwner)).toHaveLength(10);
  });

  it('maps status and API codes to counter copy', () => {
    expect(emptyCopy('cashier')).toMatch(/No completed bills/);
    expect(emptyCopy('inventory')).toMatch(/No low stock/);
    expect(emptyCopy('accountant')).toMatch(/clear for this view/);
    expect(emptyCopy('owner')).toMatch(/No sales/);
    expect(emptyCopy('mystery' as never)).toMatch(/Nothing waiting/);
    expect(successCopy('cashier')).toMatch(/till/);
    expect(successCopy('inventory')).toMatch(/Stock work/);
    expect(successCopy('accountant')).toMatch(/Khata and spend/);
    expect(successCopy('owner')).toMatch(/Shop glance/);
    expect(successCopy('mystery' as never)).toMatch(/Desk loaded/);
    expect(statusCopy('loading', null)).toBe('Loading today at a glance…');
    expect(statusCopy('loading', 'cashier')).toMatch(/Loading this outlet/);
    expect(statusCopy('empty', null)).toMatch(/Quiet counter/);
    expect(statusCopy('empty', 'cashier')).toMatch(/No completed bills/);
    expect(statusCopy('validation', null)).toMatch(/Select an outlet/);
    expect(statusCopy('denied', null)).toMatch(/counter dashboard/);
    expect(statusCopy('denied', 'cashier')).toMatch(/floor roles/);
    expect(statusCopy('conflict', null)).toMatch(/another till/);
    expect(statusCopy('failure', null)).toMatch(/Could not load the dashboard/);
    expect(statusCopy('failure', 'cashier')).toMatch(/Could not load this desk/);
    expect(statusCopy('success', null)).toBe('Today at a glance.');
    expect(statusCopy('success', 'owner')).toMatch(/Shop glance/);
    expect(statusCopy(null, null)).toBeNull();
    expect(statusCopy('failure', null, 'Custom hint')).toBe('Custom hint');
    expect(statusIcon('success').displayName || statusIcon('success').name).toBeTruthy();
    expect(statusIcon('failure')).toBeTruthy();
    expect(statusIcon('conflict')).toBeTruthy();
    expect(statusIcon('loading')).toBeTruthy();
    expect(mapApiStatus({ status: 401, code: null })).toBe('failure');
    expect(mapApiStatus({ status: 403, code: null })).toBe('denied');
    expect(mapApiStatus({ status: 409, code: null })).toBe('conflict');
    expect(mapApiStatus({ status: 422, code: null })).toBe('validation');
    expect(mapApiStatus({ status: 400, code: null })).toBe('validation');
    expect(mapApiStatus({ status: 500, code: null })).toBe('failure');
    expect(mapApiStatus({ status: 200, code: 'UNAUTHORIZED' })).toBe('failure');
    expect(mapApiStatus({ status: 200, code: 'FORBIDDEN' })).toBe('denied');
    expect(mapApiStatus({ status: 200, code: 'STALE_STATE' })).toBe('conflict');
    expect(mapApiStatus({ status: 200, code: 'CONFLICT' })).toBe('conflict');
    expect(apiStatusHint('UNAUTHORIZED')).toMatch(/session expired/i);
    expect(apiStatusHint('NO_ACTIVE_BRANCH')).toMatch(/Select an outlet/);
    expect(apiStatusHint('VALIDATION_ERROR')).toMatch(/outlet filter/);
    expect(apiStatusHint('STALE_STATE')).toMatch(/another till/);
    expect(apiStatusHint('OTHER')).toBeNull();
  });

  it('formats money, dates, greetings, periods, and percents', () => {
    expect(formatPaise(11200)).toMatch(/₹/);
    expect(formatDonutTooltip('revenue', 50, 5000)).toMatch(/₹/);
    expect(formatDonutTooltip('revenue', 50, undefined)).toBe('50');
    expect(formatDonutTooltip('orders', undefined, 100)).toBe('0');
    expect(salesTrendPct(0, 0)).toBeNull();
    expect(salesTrendPct(100, 0)).toBe(100);
    expect(salesTrendPct(150, 100)).toBe(50);
    expect(formatHeldAt('not-a-date')).toBe('not-a-date');
    expect(formatHeldAt('2026-09-06T05:00:00Z')).toMatch(/2026/);
    expect(formatQty(9)).toBe('9');
    expect(formatQty('9.5')).toBe('9.5');
    expect(formatAsOf(null)).toBe('—');
    expect(formatAsOf('bad')).toBe('bad');
    expect(formatAsOf('2026-09-06T06:00:00Z')).toMatch(/2026/);
    expect(formatDay(null)).toBe('—');
    expect(formatDay('bad-day')).toBe('bad-day');
    expect(formatDay('2026-09-06')).toMatch(/September/);
    expect(formatDay('2026-09-06T06:00:00Z')).toMatch(/September/);
    expect(greetingForHour(8)).toBe('Good morning');
    expect(greetingForHour(13)).toBe('Good afternoon');
    expect(greetingForHour(19)).toBe('Good evening');
    expect(periodLabel('7D')).toBe('last 7 days');
    expect(periodLabel('30D')).toBe('last 30 days');
    expect(periodLabel('12M')).toBe('last 12 months');
    expect(periodLabel('other')).toBe('last 7 days');
    expect(pctOf(25, 100)).toBe(25);
    expect(pctOf(1, 0)).toBe(0);
  });

  it('treats unknown widget payloads as quiet', () => {
    const owner: OwnerDesk = {
      asOf: '2026-09-06T06:00:00Z',
      todaySalesPaise: 0,
      todayBillCount: 0,
      branches: [],
      expenseTotalPaise: 0,
      lowStockCount: 0,
      sources: { sales: '/pos', stock: '/inventory', aging: '/aging', expenses: '/expenses' },
      sales: okWidget({ mystery: true }),
    };
    expect(
      isEmptyView('owner', {
        role: 'owner',
        asOf: 'a',
        generatedAt: 'g',
        scope: 'branch',
        branchId: 'b1',
        branchName: 'Main',
        permittedRoles: ['owner'],
        owner,
      }),
    ).toBe(true);
    expect(
      isEmptyView('owner', {
        role: 'owner',
        asOf: 'a',
        generatedAt: 'g',
        scope: 'branch',
        branchId: 'b1',
        branchName: 'Main',
        permittedRoles: ['owner'],
        owner: { ...owner, sales: okWidget(null) },
      }),
    ).toBe(true);
  });
});
