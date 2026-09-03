import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SubscriptionScreen from '@/screens/subscription/SubscriptionScreen';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';
import type { CurrentSubscription, PlanOffer } from '@/services/subscriptions';

vi.mock('@/services/subscriptions', async () => {
  const axios = await import('@/services/axios');
  return {
    getCatalogue: vi.fn(),
    getCurrentSubscription: vi.fn(),
    upgradePlan: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import { getCatalogue, getCurrentSubscription, upgradePlan } from '@/services/subscriptions';

const catalogueMock = vi.mocked(getCatalogue);
const currentMock = vi.mocked(getCurrentSubscription);
const upgradeMock = vi.mocked(upgradePlan);

const free: CurrentSubscription = {
  tenantId: 't1',
  planCode: 'FREE',
  status: 'ACTIVE',
  startedAt: '2026-09-03T00:00:00Z',
  expiresAt: null,
  branchLimitOverride: null,
  effectiveBranchLimit: 1,
  maxUsers: 3,
  usersUsed: 1,
  branchesUsed: 1,
  entitledModules: ['SALES'],
};

const starter: CurrentSubscription = { ...free, planCode: 'STARTER', effectiveBranchLimit: 2 };

const plans: PlanOffer[] = [
  {
    planCode: 'FREE',
    pricePaiseMonthly: 0,
    maxUsers: 3,
    maxBranches: 1,
    entitledModules: ['SALES'],
  },
  {
    planCode: 'STARTER',
    pricePaiseMonthly: 69900,
    maxUsers: 3,
    maxBranches: 2,
    entitledModules: ['SALES'],
  },
];

function renderPage(role = 'pharmacy_owner') {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: {
          userId: 'u1',
          displayName: 'Owner',
          role,
          tenantId: 't1',
          pinSet: true,
          tenantStatus: 'ACTIVE',
          emailVerified: true,
        },
      },
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <SubscriptionScreen />
      </MemoryRouter>
    </Provider>,
  );
}

describe('pharmacy plan', () => {
  beforeEach(() => {
    catalogueMock.mockReset();
    currentMock.mockReset();
    upgradeMock.mockReset();
  });

  it('loading: waits for this pharmacy’s plan', () => {
    currentMock.mockReturnValue(new Promise(() => undefined));
    catalogueMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByRole('alert')).toHaveTextContent('Loading this pharmacy’s plan…');
  });

  it('empty: no plan on file', async () => {
    currentMock.mockRejectedValue(new ApiError('missing', 404, 'NOT_FOUND'));
    catalogueMock.mockResolvedValue(plans);
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('No plan on file yet');
  });

  it('denied: staff cannot change the plan', () => {
    renderPage('pharmacy_staff');
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Only the pharmacy owner can change the plan at this counter.',
    );
    expect(currentMock).not.toHaveBeenCalled();
  });

  it('failure: network error on load', async () => {
    currentMock.mockRejectedValue(new ApiError('down', 500, 'DOWN'));
    catalogueMock.mockRejectedValue(new ApiError('down', 500, 'DOWN'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not reach the server for this pharmacy’s plan. Try again.',
    );
  });

  it('success: owner switches to Starter', async () => {
    const user = userEvent.setup();
    currentMock.mockResolvedValue(free);
    catalogueMock.mockResolvedValue(plans);
    upgradeMock.mockResolvedValue(starter);
    renderPage();
    expect(
      await screen.findByRole('heading', { name: 'Plan for this pharmacy' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Switch this pharmacy to Starter' }));
    await waitFor(() => expect(upgradeMock).toHaveBeenCalled());
    expect(await screen.findByRole('alert')).toHaveTextContent('Plan updated for this pharmacy.');
    expect(screen.getByRole('heading', { name: 'Starter licence' })).toBeInTheDocument();
    expect(screen.getByText('1 of 2 outlets in use')).toBeInTheDocument();
    expect(screen.getByText('Loyalty points stay locked until Growth or Pro.')).toBeInTheDocument();
    expect(screen.getByText('On this plan')).toBeInTheDocument();
    expect(screen.getByText('Fits this floor’s current stalls and till keys')).toBeInTheDocument();
  });

  it('conflict: downgrade blocked when usage is over the target plan', async () => {
    const user = userEvent.setup();
    currentMock.mockResolvedValue(starter);
    catalogueMock.mockResolvedValue(plans);
    upgradeMock.mockRejectedValue(new ApiError('over', 409, 'DOWNGRADE_CONFLICT'));
    renderPage();
    await screen.findByRole('heading', { name: 'Plan for this pharmacy' });
    await user.click(screen.getByRole('button', { name: 'Switch this pharmacy to Free' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This pharmacy already uses more outlets or till logins than that plan allows',
    );
  });

  it('validation: server rejects an invalid plan change', async () => {
    const user = userEvent.setup();
    currentMock.mockResolvedValue(free);
    catalogueMock.mockResolvedValue(plans);
    upgradeMock.mockRejectedValue(new ApiError('bad', 400, 'VALIDATION_ERROR'));
    renderPage();
    await screen.findByRole('heading', { name: 'Plan for this pharmacy' });
    await user.click(screen.getByRole('button', { name: 'Switch this pharmacy to Starter' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Choose a higher plan before changing this pharmacy’s plan.',
    );
  });
});
