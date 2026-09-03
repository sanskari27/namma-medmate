import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SubscriptionsScreen from '@/screens/subscriptions/SubscriptionsScreen';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';
import type { AdminSubscription, OverrideEvent } from '@/services/subscriptions';

vi.mock('@/services/subscriptions', () => ({
  listSubscriptions: vi.fn(),
  overrideSubscription: vi.fn(),
  listOverrideHistory: vi.fn(),
  isApiError: (error: unknown) => error instanceof ApiError,
}));

import {
  listOverrideHistory,
  listSubscriptions,
  overrideSubscription,
} from '@/services/subscriptions';

const listMock = vi.mocked(listSubscriptions);
const overrideMock = vi.mocked(overrideSubscription);
const historyMock = vi.mocked(listOverrideHistory);

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
