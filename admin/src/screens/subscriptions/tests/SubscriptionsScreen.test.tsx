import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SubscriptionsScreen from '@/screens/subscriptions/SubscriptionsScreen';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';
import type {
  AdminCashfreePayment,
  AdminSubscription,
  OverrideEvent,
} from '@/services/subscriptions';

vi.mock('@/services/subscriptions', () => ({
  listSubscriptions: vi.fn(),
  overrideSubscription: vi.fn(),
  listOverrideHistory: vi.fn(),
  listCashfreePayments: vi.fn(),
  isApiError: (error: unknown) => error instanceof ApiError,
}));

import {
  listCashfreePayments,
  listOverrideHistory,
  listSubscriptions,
  overrideSubscription,
} from '@/services/subscriptions';

const listMock = vi.mocked(listSubscriptions);
const overrideMock = vi.mocked(overrideSubscription);
const historyMock = vi.mocked(listOverrideHistory);
const paymentsMock = vi.mocked(listCashfreePayments);

const row: AdminSubscription = {
  tenantId: 't1',
  tenantName: 'Varshmaan Pharmacy',
  planCode: 'FREE',
  status: 'ACTIVE',
  expiresAt: null,
  branchLimitOverride: null,
  effectiveBranchLimit: 1,
  maxUsers: 3,
  usersUsed: 1,
  branchesUsed: 1,
};

const history: OverrideEvent = {
  id: 'e1',
  tenantId: 't1',
  actorUserId: 'm1',
  beforePlan: 'FREE',
  afterPlan: 'PRO',
  beforeStatus: 'ACTIVE',
  afterStatus: 'ACTIVE',
  beforeExpiresAt: null,
  afterExpiresAt: null,
  beforeBranchLimitOverride: null,
  afterBranchLimitOverride: 10,
  reason: 'Support exception',
  createdAt: '2026-09-03T00:00:00Z',
};

const failedCharge: AdminCashfreePayment = {
  id: 'pay-1',
  tenantId: 't1',
  tenantName: 'Varshmaan Pharmacy',
  planCode: 'STARTER',
  amountPaise: 69900,
  status: 'FAILED',
  errorCode: 'AMOUNT_MISMATCH',
  exception: true,
  createdAt: '2026-09-06T10:00:00Z',
};

function renderPage(role: string) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: {
          userId: 'm1',
          displayName: 'Sanskar',
          role,
          tenantId: null,
          pinSet: true,
        },
      },
    },
  });
  return render(
    <Provider store={store}>
      <SubscriptionsScreen />
    </Provider>,
  );
}

describe('HQ plan overrides', () => {
  beforeEach(() => {
    listMock.mockReset();
    overrideMock.mockReset();
    historyMock.mockReset();
    paymentsMock.mockReset();
    paymentsMock.mockResolvedValue([]);
  });

  it('loading: waits for tenant subscriptions', () => {
    listMock.mockReturnValue(new Promise(() => undefined));
    renderPage('admin_super');
    expect(screen.getByRole('alert')).toHaveTextContent('Loading tenant subscriptions…');
  });

  it('empty: no tenant subscriptions yet', async () => {
    listMock.mockResolvedValue([]);
    renderPage('admin_super');
    expect(await screen.findByRole('heading', { name: 'Plan overrides' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'No tenant subscriptions on the platform yet.',
    );
  });

  it('denied: non-MASTER cannot override', () => {
    renderPage('admin_verification');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Only MASTER can override tenant plans, status, or expiry.',
    );
    expect(listMock).not.toHaveBeenCalled();
    expect(paymentsMock).not.toHaveBeenCalled();
  });

  it('failure: cannot load subscriptions', async () => {
    listMock.mockRejectedValue(new ApiError('down', 500, 'DOWN'));
    renderPage('admin_super');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load tenant subscriptions. Try again.',
    );
  });

  it('validation: reason required before filing', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([row]);
    historyMock.mockResolvedValue([]);
    renderPage('admin_super');
    await user.click(await screen.findByRole('button', { name: 'Override file' }));
    await user.click(screen.getByRole('button', { name: 'File override' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Plan, status, and a reason are required before filing an override.',
    );
    expect(overrideMock).not.toHaveBeenCalled();
  });

  it('conflict: usage exceeds target plan', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([row]);
    historyMock.mockResolvedValue([]);
    overrideMock.mockRejectedValue(new ApiError('over', 409, 'DOWNGRADE_CONFLICT'));
    renderPage('admin_super');
    await user.click(await screen.findByRole('button', { name: 'Override file' }));
    await user.type(screen.getByLabelText('Override reason'), 'Support exception');
    await user.click(screen.getByRole('button', { name: 'File override' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Usage exceeds the target plan. Tenant must reduce outlets or users first.',
    );
  });

  it('success: files override and shows history', async () => {
    const user = userEvent.setup();
    listMock
      .mockResolvedValueOnce([row])
      .mockResolvedValueOnce([
        { ...row, planCode: 'PRO', effectiveBranchLimit: 10, branchLimitOverride: 10 },
      ]);
    historyMock.mockResolvedValue([history]);
    overrideMock.mockResolvedValue({
      ...row,
      planCode: 'PRO',
      branchLimitOverride: 10,
      effectiveBranchLimit: 10,
    });
    renderPage('admin_super');
    expect(await screen.findByText('Free tenants')).toBeInTheDocument();
    expect(screen.getByText('Open-ended')).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'Override file' }));
    expect(await screen.findByText(/FREE → PRO/)).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Plan'), 'PRO');
    await user.type(screen.getByLabelText('Branch cap override'), '10');
    await user.type(screen.getByLabelText('Override reason'), 'Support exception');
    await user.click(screen.getByRole('button', { name: 'File override' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Override filed. Plan, status, and expiry updated for the tenant.',
    );
  });
});

describe('HQ pharmacy-to-platform charges', () => {
  beforeEach(() => {
    listMock.mockReset();
    overrideMock.mockReset();
    historyMock.mockReset();
    paymentsMock.mockReset();
    listMock.mockResolvedValue([row]);
  });

  it('loading: waits for pharmacy-to-platform charges', async () => {
    paymentsMock.mockReturnValue(new Promise(() => undefined));
    renderPage('admin_super');
    expect(await screen.findByRole('heading', { name: 'Pharmacy-to-platform charges' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Loading pharmacy-to-platform charges…');
  });

  it('empty: no checkout exceptions on the ledger', async () => {
    paymentsMock.mockResolvedValue([]);
    renderPage('admin_super');
    expect(await screen.findByRole('heading', { name: 'Pharmacy-to-platform charges' })).toBeInTheDocument();
    expect(screen.getByText('No checkout exceptions on this ledger.')).toBeInTheDocument();
  });

  it('denied: verification desk cannot inspect charges', () => {
    renderPage('admin_verification');
    expect(screen.queryByRole('heading', { name: 'Pharmacy-to-platform charges' })).not.toBeInTheDocument();
    expect(paymentsMock).not.toHaveBeenCalled();
  });

  it('failure: cannot load pharmacy-to-platform charges', async () => {
    paymentsMock.mockRejectedValue(new ApiError('down', 500, 'DOWN'));
    renderPage('admin_super');
    expect(await screen.findByText('Could not load pharmacy-to-platform charges. Try again.')).toBeInTheDocument();
  });

  it('validation: charge record is not usable', async () => {
    paymentsMock.mockRejectedValue(new ApiError('bad', 422, 'VALIDATION_ERROR'));
    renderPage('admin_super');
    expect(await screen.findByText('That charge record is not usable. Refresh the ledger.')).toBeInTheDocument();
  });

  it('conflict: checkout ledger changed', async () => {
    paymentsMock.mockRejectedValue(new ApiError('stale', 409, 'STALE_STATE'));
    renderPage('admin_super');
    expect(
      await screen.findByText('Checkout ledger changed. Refresh pharmacy-to-platform charges.'),
    ).toBeInTheDocument();
  });

  it('success: lists checkout exceptions', async () => {
    paymentsMock.mockResolvedValue([failedCharge]);
    renderPage('admin_super');
    expect(await screen.findByRole('heading', { name: 'Checkout exceptions' })).toBeInTheDocument();
    expect(screen.getByText('Checkout exception')).toBeInTheDocument();
    expect(screen.getByText('₹699')).toBeInTheDocument();
    expect(screen.getByText('AMOUNT_MISMATCH')).toBeInTheDocument();
  });

  it('success: refresh restores focus on the charges ledger', async () => {
    const user = userEvent.setup();
    paymentsMock.mockResolvedValueOnce([]).mockResolvedValueOnce([failedCharge]);
    renderPage('admin_super');
    const refresh = await screen.findByRole('button', { name: 'Refresh charges' });
    await user.click(refresh);
    expect(await screen.findByText('Checkout exception')).toBeInTheDocument();
    expect(refresh).toHaveFocus();
  });
});
