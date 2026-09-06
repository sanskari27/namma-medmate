import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SubscriptionScreen from '@/screens/subscription/SubscriptionScreen';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';
import type { CashfreePayment, CurrentSubscription, PlanOffer } from '@/services/subscriptions';

vi.mock('@/services/subscriptions', async () => {
  const axios = await import('@/services/axios');
  return {
    getCatalogue: vi.fn(),
    getCurrentSubscription: vi.fn(),
    upgradePlan: vi.fn(),
    startCashfreeCheckout: vi.fn(),
    getCashfreePayment: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import {
  getCashfreePayment,
  getCatalogue,
  getCurrentSubscription,
  startCashfreeCheckout,
  upgradePlan,
} from '@/services/subscriptions';

const catalogueMock = vi.mocked(getCatalogue);
const currentMock = vi.mocked(getCurrentSubscription);
const upgradeMock = vi.mocked(upgradePlan);
const checkoutMock = vi.mocked(startCashfreeCheckout);
const paymentMock = vi.mocked(getCashfreePayment);

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

const checkout: CashfreePayment = {
  id: 'p1',
  tenantId: 't1',
  planCode: 'STARTER',
  amountPaise: 69900,
  status: 'PENDING',
  checkoutUrl: 'https://sandbox.cashfree.com/checkout/1',
  providerOrderId: 'nmm_abc',
  errorCode: null,
  createdAt: '2026-09-06T16:00:00Z',
};

function renderPage(role = 'pharmacy_owner', path = '/subscription') {
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
      <MemoryRouter initialEntries={[path]}>
        <SubscriptionScreen />
      </MemoryRouter>
    </Provider>,
  );
}

describe('pharmacy plan', () => {
  const assign = vi.fn();

  beforeEach(() => {
    catalogueMock.mockReset();
    currentMock.mockReset();
    upgradeMock.mockReset();
    checkoutMock.mockReset();
    paymentMock.mockReset();
    assign.mockReset();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, assign },
    });
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

  it('success: owner pays Starter and lands on the new licence', async () => {
    const user = userEvent.setup();
    currentMock.mockResolvedValue(free);
    catalogueMock.mockResolvedValue(plans);
    checkoutMock.mockResolvedValue(checkout);
    renderPage();
    expect(
      await screen.findByRole('heading', { name: 'Plan for this pharmacy' }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Pay this pharmacy’s plan for Starter' }),
    );
    await waitFor(() => expect(checkoutMock).toHaveBeenCalled());
    expect(upgradeMock).not.toHaveBeenCalled();
    expect(assign).toHaveBeenCalledWith('https://sandbox.cashfree.com/checkout/1');
  });

  it('success: returning from checkout shows the paid plan', async () => {
    currentMock.mockResolvedValueOnce(free).mockResolvedValueOnce(starter);
    catalogueMock.mockResolvedValue(plans);
    paymentMock.mockResolvedValue({ ...checkout, status: 'SUCCESS' });
    renderPage('pharmacy_owner', '/subscription?payment=nmm_abc');
    expect(await screen.findByRole('alert')).toHaveTextContent('Plan updated for this pharmacy.');
    expect(await screen.findByRole('heading', { name: 'Starter licence' })).toBeInTheDocument();
    expect(screen.getByText('1 of 2 outlets in use')).toBeInTheDocument();
  });

  it('empty checkout return: plan stays unchanged', async () => {
    currentMock.mockResolvedValue(free);
    catalogueMock.mockResolvedValue(plans);
    paymentMock.mockResolvedValue({ ...checkout, status: 'ABANDONED' });
    renderPage('pharmacy_owner', '/subscription?payment=nmm_abc');
    expect(await screen.findByText('Checkout not finished — plan unchanged.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Free licence' })).toBeInTheDocument();
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
    checkoutMock.mockRejectedValue(new ApiError('bad', 400, 'VALIDATION_ERROR'));
    renderPage();
    await screen.findByRole('heading', { name: 'Plan for this pharmacy' });
    await user.click(
      screen.getByRole('button', { name: 'Pay this pharmacy’s plan for Starter' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Choose a higher plan before changing this pharmacy’s plan.',
    );
  });
});
