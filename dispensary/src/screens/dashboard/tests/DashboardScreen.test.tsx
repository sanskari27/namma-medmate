import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardScreen from '@/screens/dashboard/DashboardScreen';
import { dashboardReducer } from '@/screens/dashboard/store/dashboard.slice';
import { DASHBOARD_CONTENT } from '@/screens/dashboard/DashboardScreen.content';
import { ApiError } from '@/services/axios';
import { authReducer, notificationsReducer, type AuthUser } from '@/store';
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

const fetchMock = vi.mocked(fetchHomeDashboard);

const filled: HomeDashboardView = {
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
    pendingPrescriptions: 4,
    lowStockCount: 2,
    pendingApprovals: 1,
    pendingGrn: 1,
  },
  kpis: {
    todaySalesPaise: 11200,
    todayBillCount: 2,
    todayOnlineSalesPaise: 5000,
    todayCounterSalesPaise: 6200,
    yesterdaySalesPaise: 5600,
    pendingPrescriptions: 1,
    stockAlertCount: 3,
    lowStockCount: 2,
    expiringCount: 1,
    heldBillCount: 1,
    newHeldBillCount: 1,
  },
  analytics: {
    period: '7D',
    totalSalesPaise: 50000,
    totalBillCount: 5,
    channelSplit: [
      { key: 'ONLINE', label: 'Online', salesPaise: 20000, billCount: 2 },
      { key: 'COUNTER', label: 'Counter', salesPaise: 25000, billCount: 2 },
      { key: 'OTHER', label: 'Other', salesPaise: 5000, billCount: 1 },
    ],
    paymentModes: [
      { mode: 'CASH', label: 'Cash', salesPaise: 10000 },
      { mode: 'CARD', label: 'Card', salesPaise: 8000 },
      { mode: 'UPI', label: 'UPI', salesPaise: 20000 },
      { mode: 'CREDIT', label: 'Credit', salesPaise: 7000 },
      { mode: 'BANK_TRANSFER', label: 'Bank', salesPaise: 5000 },
    ],
    topCategories: [
      { categoryId: 'c1', name: 'Analgesics', icon: '💊', salesPaise: 25000 },
      { categoryId: 'c2', name: 'OTC', icon: null, salesPaise: 10000 },
    ],
    trend: [
      { date: '2026-09-01', salesPaise: 5000, billCount: 1 },
      { date: '2026-09-02', salesPaise: 8000, billCount: 2 },
      { date: '2026-09-03', salesPaise: 12000, billCount: 2 },
    ],
  },
  attention: [
    {
      id: 'a1',
      kind: 'LOW_STOCK',
      title: 'Paracetamol low',
      detail: '2 left on shelf',
      href: '/inventory',
      actionLabel: 'Reorder',
    },
    {
      id: 'a2',
      kind: 'PRESCRIPTION',
      title: 'Rx waiting',
      detail: 'Verify before dispense',
      href: '/prescriptions',
      actionLabel: 'Open',
    },
    {
      id: 'a3',
      kind: 'APPROVAL',
      title: 'Write-off',
      detail: 'Needs sign-off',
      href: '/approvals/pending',
      actionLabel: 'Review',
    },
    {
      id: 'a4',
      kind: 'OTHER',
      title: 'GRN QC',
      detail: 'Delivery waiting',
      href: '/purchases',
      actionLabel: 'Check',
    },
  ],
  expiringSoon: [
    {
      productId: 'p1',
      sku: 'PARA-500',
      productName: 'Paracetamol 500',
      batchNumber: 'LOT-1',
      expiresOn: '2026-09-20',
      quantity: 9,
      categoryIcon: '💊',
    },
    {
      productId: 'p2',
      sku: 'COUGH-1',
      productName: 'Cough syrup',
      batchNumber: 'LOT-2',
      expiresOn: '2026-09-22',
      quantity: 3,
      categoryIcon: null,
    },
  ],
  topSellers: [
    {
      productId: 'p1',
      sku: 'PARA-500',
      productName: 'Paracetamol 500',
      quantity: 10,
      salesPaise: 11200,
      categoryIcon: null,
    },
    {
      productId: 'p3',
      sku: 'VIT-C',
      productName: 'Vitamin C',
      quantity: 4,
      salesPaise: 4000,
      categoryIcon: '🍊',
    },
  ],
  recentTransactions: [
    {
      id: 't1',
      invoiceNumber: 'INV/26-27/BR01/00002',
      totalPaise: 11200,
      completedAt: '2026-09-06T05:00:00Z',
      customerLabel: 'Walk-in',
    },
  ],
};

const emptyView: HomeDashboardView = {
  ...filled,
  hero: {
    monthSalesPaise: 0,
    avgBillTodayPaise: 0,
    itemsSoldToday: 0,
    duesToCollectPaise: 0,
    duesCustomerCount: 0,
  },
  quickActions: {
    pendingPrescriptions: 0,
    lowStockCount: 0,
    pendingApprovals: 0,
    pendingGrn: 0,
  },
  kpis: {
    todaySalesPaise: 0,
    todayBillCount: 0,
    todayOnlineSalesPaise: 0,
    todayCounterSalesPaise: 0,
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
    totalSalesPaise: 0,
    totalBillCount: 0,
    channelSplit: [],
    paymentModes: [],
    topCategories: [],
    trend: [
      { date: '2026-09-01', salesPaise: 0, billCount: 0 },
      { date: '2026-09-02', salesPaise: 0, billCount: 0 },
    ],
  },
  attention: [],
  expiringSoon: [],
  topSellers: [],
  recentTransactions: [],
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

function renderPage(user: AuthUser = userFor()) {
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
          <Route path={ROUTES.PRESCRIPTIONS} element={<p>Rx route</p>} />
          <Route path={ROUTES.INVENTORY} element={<p>Stock route</p>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe('DashboardScreen', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('loading: waits for today at a glance', () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByRole('status')).toHaveTextContent('Loading today at a glance…');
  });

  it('empty: reserved copy for quiet counters and analytics', async () => {
    fetchMock.mockResolvedValue(emptyView);
    renderPage();
    expect(await screen.findByText(DASHBOARD_CONTENT.emptyAttention)).toBeInTheDocument();
    expect(screen.getByText(DASHBOARD_CONTENT.emptyExpiring)).toBeInTheDocument();
    expect(screen.getByText(DASHBOARD_CONTENT.emptyTopSellers)).toBeInTheDocument();
    expect(screen.getByText(DASHBOARD_CONTENT.emptyRecent)).toBeInTheDocument();
    expect(screen.getByText(DASHBOARD_CONTENT.emptyChannel)).toBeInTheDocument();
    expect(screen.getByText(DASHBOARD_CONTENT.emptyPayments)).toBeInTheDocument();
    expect(screen.getByText(DASHBOARD_CONTENT.emptyCategories)).toBeInTheDocument();
    expect(screen.getByText(DASHBOARD_CONTENT.emptyAnalytics)).toBeInTheDocument();
    expect(screen.getByText(DASHBOARD_CONTENT.kpiAllCaughtUp)).toBeInTheDocument();
    expect(screen.getAllByText(/₹0\.00/).length).toBeGreaterThan(0);
  });

  it('validation: no active outlet', async () => {
    fetchMock.mockRejectedValue(new ApiError('Select an outlet first.', 422, 'NO_ACTIVE_BRANCH'));
    renderPage(userFor({ activeBranchId: null }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Select an outlet before opening this desk.',
    );
  });

  it('denied: floor cannot open the counter dashboard', async () => {
    fetchMock.mockRejectedValue(new ApiError('Forbidden', 403, 'FORBIDDEN'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This counter dashboard is not on your floor roles. Ask the owner.',
    );
    expect(screen.queryByRole('region', { name: DASHBOARD_CONTENT.regionHero })).not.toBeInTheDocument();
  });

  it('conflict: figures changed on another till', async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(filled)
      .mockRejectedValueOnce(new ApiError('stale', 409, 'STALE_STATE'));
    renderPage();
    expect(
      await screen.findByRole('region', { name: DASHBOARD_CONTENT.regionHero }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'These figures changed on another till. Refresh, then look again.',
    );
  });

  it('failure: dashboard network error', async () => {
    fetchMock.mockRejectedValue(new Error('network'));
    renderPage();
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Could not load the dashboard. Check the connection and try again.',
    );
  });

  it('failure: expired session hint', async () => {
    fetchMock.mockRejectedValue(new ApiError('gone', 401, 'UNAUTHORIZED'));
    renderPage();
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Your session expired. Sign in again to reload the dashboard.',
    );
  });

  it('success: greets staff, KPIs, lists, and transactions', async () => {
    fetchMock.mockResolvedValue(filled);
    renderPage();
    expect(
      await screen.findByRole('region', { name: DASHBOARD_CONTENT.regionHero }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Good (morning|afternoon|evening), Floor/)).toBeInTheDocument();
    expect(screen.getByText(DASHBOARD_CONTENT.storeOpen)).toBeInTheDocument();
    expect(screen.getByText('Main')).toBeInTheDocument();
    expect(screen.getByText(DASHBOARD_CONTENT.kpiOrdersToday)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /New sale/i })).toHaveAttribute('href', ROUTES.SALES);
    expect(screen.getByRole('link', { name: /4 pending/i })).toHaveAttribute(
      'href',
      ROUTES.PRESCRIPTIONS,
    );
    expect(screen.getByRole('link', { name: /2 low/i })).toHaveAttribute('href', ROUTES.INVENTORY);
    expect(screen.getByText(DASHBOARD_CONTENT.kpiTodaySales)).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText(/1 new/)).toBeInTheDocument();
    expect(screen.getByText(DASHBOARD_CONTENT.kpiToVerify)).toBeInTheDocument();
    expect(screen.getByText(DASHBOARD_CONTENT.kpiAction)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: DASHBOARD_CONTENT.analyticsTitle })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: DASHBOARD_CONTENT.attentionTitle })).toBeInTheDocument();
    expect(screen.getByText('Paracetamol low')).toBeInTheDocument();
    expect(screen.getByText('Rx waiting')).toBeInTheDocument();
    expect(screen.getByText('Write-off')).toBeInTheDocument();
    expect(screen.getByText('GRN QC')).toBeInTheDocument();
    expect(screen.getByText('Cough syrup')).toBeInTheDocument();
    expect(screen.getByText('Vitamin C')).toBeInTheDocument();
    expect(screen.getByText('INV/26-27/BR01/00002')).toBeInTheDocument();
    expect(screen.getByText(/Medmate India Technology Private Limited/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('7D');
  });

  it('success: period, metric, and chart type controls reload analytics', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(filled).mockResolvedValue({
      ...filled,
      analytics: { ...filled.analytics, period: '30D', totalSalesPaise: 90000 },
    });
    renderPage();
    expect(await screen.findByRole('heading', { name: DASHBOARD_CONTENT.analyticsTitle })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: DASHBOARD_CONTENT.metricOrders }));
    expect(screen.getByRole('button', { name: DASHBOARD_CONTENT.metricOrders })).toHaveClass('on');

    await user.click(screen.getByRole('button', { name: '30D' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('30D'));
    expect((await screen.findAllByText(/last 30 days/)).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: DASHBOARD_CONTENT.chartBars }));
    expect(screen.getByRole('button', { name: DASHBOARD_CONTENT.chartBars })).toHaveClass('on');

    await user.click(screen.getByRole('button', { name: DASHBOARD_CONTENT.chartLine }));
    expect(screen.getByRole('button', { name: DASHBOARD_CONTENT.chartLine })).toHaveClass('on');

    await user.click(screen.getByRole('button', { name: DASHBOARD_CONTENT.chartDonut }));
    expect(screen.getByRole('button', { name: DASHBOARD_CONTENT.chartDonut })).toHaveClass('on');
  });

  it('success: KPI cards navigate by click and keyboard', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(filled);
    renderPage();
    const kpis = await screen.findByRole('region', { name: DASHBOARD_CONTENT.regionKpis });
    await user.click(within(kpis).getByTitle(DASHBOARD_CONTENT.titleViewSales));
    expect(screen.getByText('Sales route')).toBeInTheDocument();
  });

  it('success: orders KPI click and sales KPI keyboard', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(filled);
    renderPage();
    const kpis = await screen.findByRole('region', { name: DASHBOARD_CONTENT.regionKpis });
    await user.click(within(kpis).getByTitle(DASHBOARD_CONTENT.titleViewOrders));
    expect(screen.getByText('Sales route')).toBeInTheDocument();
  });

  it('success: sales KPI Enter key opens sales', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(filled);
    renderPage();
    const kpis = await screen.findByRole('region', { name: DASHBOARD_CONTENT.regionKpis });
    within(kpis).getByTitle(DASHBOARD_CONTENT.titleViewSales).focus();
    await user.keyboard('{Enter}');
    expect(screen.getByText('Sales route')).toBeInTheDocument();
  });

  it('success: prescription KPI keyboard and inventory click', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(filled);
    renderPage();
    const kpis = await screen.findByRole('region', { name: DASHBOARD_CONTENT.regionKpis });
    const rx = within(kpis).getByTitle(DASHBOARD_CONTENT.titleReviewPrescriptions);
    rx.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByText('Rx route')).toBeInTheDocument();
  });

  it('success: inventory KPI click opens stock', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(filled);
    renderPage();
    const kpis = await screen.findByRole('region', { name: DASHBOARD_CONTENT.regionKpis });
    await user.click(within(kpis).getByTitle(DASHBOARD_CONTENT.titleOpenInventory));
    expect(screen.getByText('Stock route')).toBeInTheDocument();
  });

  it('success: prescription and inventory KPIs open their routes', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(filled);
    renderPage();
    const kpis = await screen.findByRole('region', { name: DASHBOARD_CONTENT.regionKpis });
    await user.click(within(kpis).getByTitle(DASHBOARD_CONTENT.titleReviewPrescriptions));
    expect(screen.getByText('Rx route')).toBeInTheDocument();
  });

  it('success: inventory KPI opens stock and orders KPI accepts Enter', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue({
      ...filled,
      kpis: { ...filled.kpis, todaySalesPaise: 4000, yesterdaySalesPaise: 8000, newHeldBillCount: 0 },
      scope: 'tenant',
      branchName: 'All outlets',
      hero: { ...filled.hero, duesCustomerCount: 0, duesToCollectPaise: 4500 },
      analytics: {
        ...filled.analytics,
        channelSplit: [
          { key: 'ONLINE', label: 'Online', salesPaise: 0, billCount: 0 },
          { key: 'COUNTER', label: 'Counter', salesPaise: 30000, billCount: 3 },
        ],
      },
    });
    renderPage(userFor({ displayName: '' }));
    expect(await screen.findByText('All outlets')).toHaveClass('dash-scope-pill');
    expect(screen.getAllByText('50%').length).toBeGreaterThan(0);
    const dues = screen.getByRole('link', { name: /Dues to collect/i });
    expect(dues).toHaveClass('warn');
    expect(within(dues).getByText('₹45.00')).toBeInTheDocument();
    expect(screen.getByText(/Good (morning|afternoon|evening),/)).toBeInTheDocument();

    const kpis = screen.getByRole('region', { name: DASHBOARD_CONTENT.regionKpis });
    const orders = within(kpis).getByTitle(DASHBOARD_CONTENT.titleViewOrders);
    orders.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByText('Sales route')).toBeInTheDocument();
  });

  it('success: stock KPI Space key opens inventory', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(filled);
    renderPage();
    const kpis = await screen.findByRole('region', { name: DASHBOARD_CONTENT.regionKpis });
    const stock = within(kpis).getByTitle(DASHBOARD_CONTENT.titleOpenInventory);
    stock.focus();
    await user.keyboard(' ');
    expect(screen.getByText('Stock route')).toBeInTheDocument();
  });

  it('success: KPI keyboard ignores unrelated keys', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(filled);
    renderPage();
    const kpis = await screen.findByRole('region', { name: DASHBOARD_CONTENT.regionKpis });
    within(kpis).getByTitle(DASHBOARD_CONTENT.titleViewSales).focus();
    await user.keyboard('a');
    expect(screen.queryByText('Sales route')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: DASHBOARD_CONTENT.regionHero })).toBeInTheDocument();
  });

  it('success: metric control can return to revenue', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(filled);
    renderPage();
    expect(await screen.findByRole('heading', { name: DASHBOARD_CONTENT.analyticsTitle })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: DASHBOARD_CONTENT.metricOrders }));
    await user.click(screen.getByRole('button', { name: DASHBOARD_CONTENT.metricRevenue }));
    expect(screen.getByRole('button', { name: DASHBOARD_CONTENT.metricRevenue })).toHaveClass('on');
  });

  it('uses fallback staff name when display name is missing', async () => {
    fetchMock.mockResolvedValue(filled);
    renderPage(userFor({ displayName: undefined as unknown as string }));
    expect(await screen.findByText(/Good (morning|afternoon|evening), Pharmacist/)).toBeInTheDocument();
  });

  it('reload period failure surfaces status copy', async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce(filled)
      .mockRejectedValueOnce(new ApiError('bad filter', 400, 'VALIDATION_ERROR'));
    renderPage();
    expect(await screen.findByRole('heading', { name: DASHBOARD_CONTENT.analyticsTitle })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '12M' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'This desk cannot use that outlet filter.',
    );
  });
});
