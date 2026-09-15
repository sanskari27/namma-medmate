import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardScreen from '@/screens/dashboard/DashboardScreen';
import { dashboardReducer } from '@/screens/dashboard/store/dashboard.slice';
import { DASHBOARD_CONTENT } from '@/screens/dashboard/DashboardScreen.content';
import { DESK_LABEL } from '@/screens/dashboard/DashboardScreen.utils';
import { ApiError } from '@/services/axios';
import { authReducer, notificationsReducer, type AuthUser } from '@/store';
import type { DashboardView } from '@/services/dashboards';
import type { HomeDashboardView } from '@/services/homeDashboard';
import { ROUTES } from '@/libs/constants/routes.const';

vi.mock('@/services/homeDashboard', async () => {
  const axios = await import('@/services/axios');
  return {
    fetchHomeDashboard: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

vi.mock('@/services/dashboards', async () => {
  const axios = await import('@/services/axios');
  return {
    fetchDashboard: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

vi.mock('@molecules/area-metric-chart', () => ({
  AreaMetricChart: ({ emptyLabel }: { emptyLabel: string }) => <p>{emptyLabel}</p>,
}));

vi.mock('@molecules/bar-metric-chart', () => ({
  BarMetricChart: ({ emptyLabel }: { emptyLabel: string }) => <p>{emptyLabel}</p>,
}));

vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children?: React.ReactNode }) => (
      <div data-testid="recharts-box">{children}</div>
    ),
  };
});

import { fetchHomeDashboard } from '@/services/homeDashboard';
import { fetchDashboard } from '@/services/dashboards';

const homeMock = vi.mocked(fetchHomeDashboard);
const deskMock = vi.mocked(fetchDashboard);

const quietHome: HomeDashboardView = {
  asOf: '2026-09-06',
  generatedAt: '2026-09-06T06:00:00Z',
  scope: 'branch',
  branchId: 'b1',
  branchName: 'Main',
  hero: {
    monthSalesPaise: 250000,
    avgBillTodayPaise: 11200,
    itemsSoldToday: 3,
    duesToCollectPaise: 12000,
    duesCustomerCount: 2,
  },
  quickActions: {
    pendingPrescriptions: 0,
    lowStockCount: 0,
    pendingApprovals: 0,
    pendingGrn: 0,
  },
  kpis: {
    todaySalesPaise: 11200,
    todayBillCount: 1,
    todayOnlineSalesPaise: 0,
    todayCounterSalesPaise: 11200,
    yesterdaySalesPaise: 0,
    pendingPrescriptions: 0,
    stockAlertCount: 0,
    lowStockCount: 0,
    expiringCount: 0,
    heldBillCount: 0,
    newHeldBillCount: 0,
  },
  analytics: {
    period: '7D',
    totalSalesPaise: 11200,
    totalBillCount: 1,
    channelSplit: [],
    paymentModes: [],
    topCategories: [],
    trend: [],
  },
  attention: [],
  expiringSoon: [],
  topSellers: [],
  recentTransactions: [],
};

const cashierDesk: DashboardView = {
  role: 'cashier',
  asOf: '2026-09-06',
  generatedAt: '2026-09-06T06:00:00Z',
  scope: 'branch',
  branchId: 'b1',
  branchName: 'Main',
  permittedRoles: ['cashier'],
  cashier: {
    todaySalesPaise: 11200,
    todayBillCount: 1,
    holds: [
      {
        id: 'h1',
        invoiceNumber: 'INV/H1',
        totalPaise: 5000,
        heldAt: '2026-09-06T04:00:00Z',
      },
    ],
    sources: { sales: '/pos', holds: '/pos' },
  },
};

const inventoryDesk: DashboardView = {
  role: 'inventory',
  asOf: '2026-09-06',
  generatedAt: '2026-09-06T06:00:00Z',
  scope: 'branch',
  branchId: 'b1',
  branchName: 'Main',
  permittedRoles: ['inventory'],
  inventory: {
    lowStock: [
      {
        productId: 'p1',
        sku: 'LOW-1',
        productName: 'Low Pack',
        onHand: 2,
        reorderLevel: 10,
      },
    ],
    pendingTransfers: [{ id: 't1', status: 'IN_TRANSIT', direction: 'IN', href: '/inventory' }],
    pendingGrn: [
      { id: 'g1', receiptNumber: 'GRN-1', status: 'PENDING_QC', href: '/purchases' },
    ],
    sources: { stock: '/inventory', transfers: '/inventory', grn: '/purchases' },
  },
};

const accountantDesk: DashboardView = {
  role: 'accountant',
  asOf: '2026-09-06',
  generatedAt: '2026-09-06T06:00:00Z',
  scope: 'branch',
  branchId: 'b1',
  branchName: 'Main',
  permittedRoles: ['accountant'],
  accountant: {
    receivablesTotalPaise: 12000,
    payablesTotalPaise: 8000,
    expenseTotalPaise: 15000,
    receivableBuckets: [],
    sources: { aging: '/aging', expenses: '/expenses' },
  },
};

const bothDesksCashier: DashboardView = {
  ...cashierDesk,
  permittedRoles: ['cashier', 'inventory'],
};

function userFor(extras: Partial<AuthUser> = {}): AuthUser {
  return {
    userId: 'u1',
    displayName: 'Floor Chemist',
    role: 'pharmacy_owner',
    tenantId: 't1',
    pinSet: true,
    tenantStatus: 'ACTIVE',
    emailVerified: true,
    modules: ['SALES', 'INVENTORY', 'FINANCE'],
    branches: [{ id: 'b1', name: 'Main', branchCode: 'BR01', status: 'ACTIVE' }],
    activeBranchId: 'b1',
    ...extras,
  };
}

function cashierUser(extras: Partial<AuthUser> = {}): AuthUser {
  return userFor({
    role: 'pharmacy_staff',
    displayName: 'Till staff',
    modules: ['SALES'],
    roles: [{ id: 'r1', name: 'Cashier', code: 'cashier', kind: 'PREDEFINED' }],
    ...extras,
  });
}

function renderPage(user: AuthUser) {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      notifications: notificationsReducer,
      dashboard: dashboardReducer,
    },
    preloadedState: { auth: { user } },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[ROUTES.DASHBOARD]}>
        <Routes>
          <Route path={ROUTES.DASHBOARD} element={<DashboardScreen />} />
          <Route path={ROUTES.SALES} element={<p>Sales route</p>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe('Dashboard desks', () => {
  beforeEach(() => {
    homeMock.mockReset();
    deskMock.mockReset();
  });

  it('loading: cashier waits for the till desk', () => {
    deskMock.mockReturnValue(new Promise(() => undefined));
    renderPage(cashierUser());
    expect(screen.getByRole('status')).toHaveTextContent("Loading this outlet's desk…");
  });

  it('empty: cashier quiet till has reserved copy', async () => {
    deskMock.mockResolvedValue({
      ...cashierDesk,
      cashier: {
        todaySalesPaise: 0,
        todayBillCount: 0,
        holds: [],
        sources: { sales: '/pos', holds: '/pos' },
      },
    });
    renderPage(cashierUser());
    expect(
      await screen.findByText('No completed bills today. Held bills stay on this till until collected.'),
    ).toBeInTheDocument();
  });

  it('validation: cashier with no outlet', async () => {
    deskMock.mockRejectedValue(new ApiError('Select an outlet first.', 422, 'NO_ACTIVE_BRANCH'));
    renderPage(cashierUser({ activeBranchId: null }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Select an outlet before opening this desk.',
    );
  });

  it('denied: cashier cannot open owner home', async () => {
    deskMock.mockRejectedValue(new ApiError('Forbidden', 403, 'FORBIDDEN'));
    renderPage(cashierUser());
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This desk is not on your floor roles. Ask the owner.',
    );
    expect(screen.queryByText(DASHBOARD_CONTENT.metricDuesToCollect)).not.toBeInTheDocument();
  });

  it('conflict: till figures changed', async () => {
    const user = userEvent.setup();
    deskMock.mockResolvedValueOnce(cashierDesk).mockRejectedValueOnce(
      new ApiError('stale', 409, 'STALE_STATE'),
    );
    renderPage(cashierUser());
    expect(await screen.findByText('INV/H1')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'These figures changed on another till. Refresh, then look again.',
    );
  });

  it('failure: till desk network error', async () => {
    deskMock.mockRejectedValue(new Error('offline'));
    renderPage(cashierUser());
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Could not load this desk. Check the connection and try again.',
    );
  });

  it('success: cashier sees today sales and holds, not owner chrome', async () => {
    deskMock.mockResolvedValue(cashierDesk);
    renderPage(cashierUser());
    expect(await screen.findByText('INV/H1')).toBeInTheDocument();
    expect(screen.getByText(DESK_LABEL.cashier)).toBeInTheDocument();
    expect(screen.getByText(/₹112\.00/)).toBeInTheDocument();
    expect(screen.queryByText(DASHBOARD_CONTENT.metricDuesToCollect)).not.toBeInTheDocument();
    expect(screen.queryByText(DASHBOARD_CONTENT.analyticsTitle)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /New purchase/i })).not.toBeInTheDocument();
    expect(homeMock).not.toHaveBeenCalled();
    expect(deskMock).toHaveBeenCalledWith('cashier', expect.anything());
  });

  it('success: inventory sees low stock, transfers, and GRN', async () => {
    deskMock.mockResolvedValue(inventoryDesk);
    renderPage(
      userFor({
        role: 'pharmacy_staff',
        displayName: 'Stock staff',
        modules: ['INVENTORY'],
        roles: [{ id: 'r2', name: 'Inventory', code: 'inventory', kind: 'PREDEFINED' }],
      }),
    );
    expect(await screen.findByText('Low Pack')).toBeInTheDocument();
    expect(screen.getByText('GRN-1')).toBeInTheDocument();
    expect(screen.getByText('IN_TRANSIT')).toBeInTheDocument();
    expect(screen.queryByText('INV/H1')).not.toBeInTheDocument();
    expect(deskMock).toHaveBeenCalledWith('inventory', expect.anything());
  });

  it('success: accountant sees khata and spend, not till holds', async () => {
    deskMock.mockResolvedValue(accountantDesk);
    renderPage(
      userFor({
        role: 'pharmacy_staff',
        displayName: 'Books staff',
        modules: ['FINANCE'],
        roles: [{ id: 'r3', name: 'Accountant', code: 'accountant', kind: 'PREDEFINED' }],
      }),
    );
    expect(await screen.findByText(/₹120\.00/)).toBeInTheDocument();
    expect(screen.getByText(/₹80\.00/)).toBeInTheDocument();
    expect(screen.getByText(/₹150\.00/)).toBeInTheDocument();
    expect(screen.queryByText('INV/H1')).not.toBeInTheDocument();
    expect(deskMock).toHaveBeenCalledWith('accountant', expect.anything());
  });

  it('success: owner still opens shop glance home', async () => {
    homeMock.mockResolvedValue(quietHome);
    renderPage(userFor());
    expect(await screen.findByText(DASHBOARD_CONTENT.metricDuesToCollect)).toBeInTheDocument();
    expect(homeMock).toHaveBeenCalledWith('7D');
    expect(deskMock).not.toHaveBeenCalled();
  });

  it('success: owner can switch to the till desk', async () => {
    const user = userEvent.setup();
    homeMock.mockResolvedValue(quietHome);
    deskMock.mockResolvedValue({
      ...cashierDesk,
      permittedRoles: ['owner', 'cashier', 'inventory', 'accountant'],
    });
    renderPage(userFor());
    expect(await screen.findByText(DASHBOARD_CONTENT.metricDuesToCollect)).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: DESK_LABEL.cashier }));
    expect(await screen.findByText('INV/H1')).toBeInTheDocument();
    expect(deskMock).toHaveBeenCalledWith('cashier', expect.anything());
    expect(screen.queryByText(DASHBOARD_CONTENT.metricDuesToCollect)).not.toBeInTheDocument();
  });

  it('success: multi-role staff switch desks without duplicate widgets', async () => {
    const user = userEvent.setup();
    deskMock
      .mockResolvedValueOnce(bothDesksCashier)
      .mockResolvedValueOnce({ ...inventoryDesk, permittedRoles: ['cashier', 'inventory'] });
    renderPage(
      cashierUser({
        modules: ['SALES', 'INVENTORY'],
        roles: [
          { id: 'r1', name: 'Cashier', code: 'cashier', kind: 'PREDEFINED' },
          { id: 'r2', name: 'Inventory', code: 'inventory', kind: 'PREDEFINED' },
        ],
      }),
    );
    expect(await screen.findByText('INV/H1')).toBeInTheDocument();
    expect(screen.queryByText('Low Pack')).not.toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: DESK_LABEL.inventory }));
    expect(await screen.findByText('Low Pack')).toBeInTheDocument();
    expect(screen.queryByText('INV/H1')).not.toBeInTheDocument();
  });

  it('denied: staff without a dashboard desk never hits owner home', async () => {
    renderPage(
      userFor({
        role: 'pharmacy_staff',
        modules: [],
        roles: [{ id: 'r9', name: 'Pharmacist', code: 'pharmacist', kind: 'PREDEFINED' }],
      }),
    );
    expect(
      await screen.findByRole('alert'),
    ).toHaveTextContent('This counter dashboard is not on your floor roles. Ask the owner.');
    expect(homeMock).not.toHaveBeenCalled();
    expect(deskMock).not.toHaveBeenCalled();
  });
});
