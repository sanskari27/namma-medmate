import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TrendsScreen from '@/screens/trends/TrendsScreen';
import { ROUTES } from '@/libs/constants/routes.const';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';
import type { AnalyticsView } from '@/services/analytics';

vi.mock('@/services/analytics', async () => {
  const axios = await import('@/services/axios');
  return {
    getAnalytics: vi.fn(),
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

import { getAnalytics } from '@/services/analytics';

const getMock = vi.mocked(getAnalytics);

const filled: AnalyticsView = {
  compare: 'WOW',
  from: '2026-08-31',
  to: '2026-09-06',
  priorFrom: '2026-08-24',
  priorTo: '2026-08-30',
  scope: 'branch',
  branchId: 'b1',
  branchName: 'Main',
  current: { salesPaise: 11200, billCount: 1, unitsSold: 1 },
  prior: { salesPaise: 5600, billCount: 1, unitsSold: 1 },
  delta: { salesPaise: 5600, salesPctBps: 10000 },
  salesTrend: {
    points: [{ date: '2026-08-31', currentPaise: 0, priorPaise: 5600 }],
  },
  topSellers: [{ productId: 'p1', name: 'Top Pack', sku: 'AN-TOP', units: 1, salesPaise: 11200 }],
  slowDeadStock: [
    {
      productId: 'p2',
      name: 'Idle Pack',
      sku: 'AN-DEAD',
      classification: 'DEAD',
      onHand: '10',
      unitsSold: 0,
    },
  ],
  customerFrequency: [
    { bucket: 'WALK_IN', currentCount: 1, priorCount: 0 },
    { bucket: 'VISITS_1', currentCount: 0, priorCount: 1 },
    { bucket: 'VISITS_2_3', currentCount: 0, priorCount: 0 },
    { bucket: 'VISITS_4_PLUS', currentCount: 0, priorCount: 0 },
  ],
};

const emptyView: AnalyticsView = {
  ...filled,
  current: { salesPaise: 0, billCount: 0, unitsSold: 0 },
  prior: { salesPaise: 0, billCount: 0, unitsSold: 0 },
  delta: { salesPaise: 0, salesPctBps: null },
  salesTrend: { points: [] },
  topSellers: [],
  slowDeadStock: [],
  customerFrequency: [
    { bucket: 'WALK_IN', currentCount: 0, priorCount: 0 },
    { bucket: 'VISITS_1', currentCount: 0, priorCount: 0 },
    { bucket: 'VISITS_2_3', currentCount: 0, priorCount: 0 },
    { bucket: 'VISITS_4_PLUS', currentCount: 0, priorCount: 0 },
  ],
};

function renderPage(
  role = 'pharmacy_owner',
  modules: string[] = ['REPORTING'],
  activeBranchId: string | null = 'b1',
) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: {
          userId: 'user-1',
          displayName: 'Varshmaan',
          role,
          tenantId: 't1',
          pinSet: true,
          tenantStatus: 'ACTIVE',
          emailVerified: true,
          modules,
          branches: [{ id: 'b1', name: 'Main', branchCode: 'BR01', status: 'ACTIVE' }],
          activeBranchId,
        },
      },
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <TrendsScreen />
      </MemoryRouter>
    </Provider>,
  );
}

describe('TrendsScreen', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it('loading: reserved compare-weeks status while the window loads', () => {
    getMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByRole('status')).toHaveTextContent('Loading this week vs last week…');
    expect(screen.getByRole('heading', { name: 'Compare weeks' })).toBeInTheDocument();
  });

  it('empty: no completed bills in this window', async () => {
    getMock.mockResolvedValue(emptyView);
    renderPage();
    expect(
      await screen.findByText(
        'No completed bills in this window. Collect a bill at the till and it lands here.',
      ),
    ).toBeInTheDocument();
    expect(ROUTES.REPORTS).toBe('/reports');
  });

  it('validation: matching week or month windows only', async () => {
    getMock.mockRejectedValue(
      new ApiError(
        'Use matching week or month windows of 366 days or less.',
        422,
        'RANGE_UNSUPPORTED',
      ),
    );
    renderPage();
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Use matching week or month windows of 366 days or less.',
    );
  });

  it('denied: till staff without reporting cannot open compare weeks', () => {
    renderPage('pharmacy_staff', ['SALES']);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Till staff cannot open compare weeks. Ask the owner for Accounts access.',
    );
    expect(getMock).not.toHaveBeenCalled();
  });

  it('denied: Growth plan is required and does not leak charts', async () => {
    getMock.mockRejectedValue(
      new ApiError(
        'Growth or Pro is required to compare weeks and open trend charts.',
        422,
        'PLAN_LIMIT',
      ),
    );
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Compare weeks is on Growth. Open the plan to turn it on.',
    );
    expect(screen.getByRole('link', { name: 'Open the plan' })).toHaveAttribute(
      'href',
      ROUTES.SUBSCRIPTION,
    );
    expect(screen.queryByText('Top Pack')).not.toBeInTheDocument();
    expect(screen.queryByText(/forecast/i)).not.toBeInTheDocument();
  });

  it('conflict: another till changed this window', async () => {
    getMock.mockRejectedValue(new ApiError('Stale', 409, 'STALE_STATE'));
    renderPage();
    expect(await screen.findByRole('status')).toHaveTextContent(
      'This window changed on another till. Reload, then compare again.',
    );
  });

  it('failure: connection copy when analytics cannot load', async () => {
    getMock.mockRejectedValue(new ApiError('Could not reach the server', 0, 'NETWORK'));
    renderPage();
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Could not load compare weeks. Check the connection and try again.',
    );
  });

  it('success: this week vs last week, charts, no forecast, restores show-window focus', async () => {
    const user = userEvent.setup();
    getMock.mockResolvedValue(filled);
    renderPage();
    expect(await screen.findByText('Collected this week')).toBeInTheDocument();
    expect(screen.getAllByText(/Top Pack/).length).toBeGreaterThan(0);
    expect(screen.getByText('Idle Pack')).toBeInTheDocument();
    expect(screen.getByText(/Walk-in bills/)).toBeInTheDocument();
    expect(screen.queryByText(/forecast/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/stock-out in/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'This month vs last month' }));
    await user.click(screen.getByRole('button', { name: 'Show this window' }));
    await waitFor(() =>
      expect(getMock).toHaveBeenCalledWith(expect.objectContaining({ compare: 'MOM' })),
    );
    expect(screen.getByRole('button', { name: 'Show this window' })).toHaveFocus();
  });

  it('success: owner on all outlets loads the tenant window', async () => {
    getMock.mockResolvedValue(filled);
    renderPage('pharmacy_owner', ['REPORTING'], null);
    expect(await screen.findByText('Collected this week')).toBeInTheDocument();
    expect(getMock).toHaveBeenCalledWith(
      expect.objectContaining({ compare: 'WOW', scope: 'tenant' }),
    );
  });
});
