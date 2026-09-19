import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CreditScreen from '@/screens/credit/CreditScreen';
import { ApiError } from '@/services/axios';
import { creditReducer } from '@/screens/credit/store';
import { authReducer } from '@/store';

vi.mock('@/services/credit', async () => {
  const axios = await import('@/services/axios');
  return {
    listOutstandingCreditAccounts: vi.fn(),
    settleCustomerCredit: vi.fn(),
    formatPaise: (paise: number) =>
      `₹${(paise / 100).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import { listOutstandingCreditAccounts, settleCustomerCredit } from '@/services/credit';
import { emptySummary } from '@/screens/credit/CreditScreen.utils';

const listMock = vi.mocked(listOutstandingCreditAccounts);
const settleMock = vi.mocked(settleCustomerCredit);

const sample = {
  customerId: 'c1',
  customerName: 'Ravi Kumar',
  customerPhone: '9876500001',
  limitPaise: 50000,
  balancePaise: 12000,
  availablePaise: 38000,
  version: 2,
  billCount: 1,
  givenPaise: 12000,
  repaidPaise: 0,
  ageDays: 12,
};

function directory(items = [sample]) {
  return { summary: emptySummary(), aging: [], items, payments: [] };
}

function renderPage(modules: string[] = ['CRM']) {
  const store = configureStore({
    reducer: { auth: authReducer, credit: creditReducer },
    preloadedState: {
      auth: {
        user: {
          userId: 'u1',
          displayName: 'Owner',
          role: 'pharmacy_owner',
          tenantId: 't1',
          pinSet: true,
          tenantStatus: 'ACTIVE',
          emailVerified: true,
          modules,
        },
      },
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <CreditScreen />
      </MemoryRouter>
    </Provider>,
  );
}

describe('CreditScreen', () => {
  beforeEach(() => {
    listMock.mockReset();
    settleMock.mockReset();
  });

  it('loading: waits for outstanding list', () => {
    listMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByText('Loading khata balances…')).toBeInTheDocument();
  });

  it('empty: no outstanding', async () => {
    listMock.mockResolvedValue(directory([]));
    renderPage();
    expect(
      await screen.findByText('No outstanding khata on this pharmacy yet.'),
    ).toBeInTheDocument();
  });

  it('denied: till without CRM', () => {
    renderPage(['SALES']);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'CRM module is required to open Credit · Khata.',
    );
    expect(listMock).not.toHaveBeenCalled();
  });

  it('failure: list error', async () => {
    listMock.mockRejectedValue(new Error('network'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load khata balances. Try again.',
    );
  });

  it('success: lists outstanding and settles', async () => {
    const user = userEvent.setup();
    listMock
      .mockResolvedValueOnce(directory())
      .mockResolvedValueOnce(
        directory([{ ...sample, balancePaise: 7000, availablePaise: 43000, version: 3 }]),
      );
    settleMock.mockResolvedValue({
      customerId: 'c1',
      limitPaise: 50000,
      balancePaise: 7000,
      availablePaise: 43000,
      version: 3,
      entries: [],
    });
    renderPage();
    expect(await screen.findByText('Ravi Kumar')).toBeInTheDocument();
    expect(screen.getAllByText('₹120.00').length).toBeGreaterThan(0);
    await user.click(screen.getByText('Ravi Kumar'));
    await user.click(await screen.findByRole('button', { name: 'Record repayment' }));
    await screen.findByLabelText('Amount (₹)');
    await user.clear(screen.getByLabelText('Amount (₹)'));
    await user.type(screen.getByLabelText('Amount (₹)'), '50');
    await user.click(screen.getByRole('button', { name: 'Post settlement' }));
    await waitFor(() => expect(settleMock).toHaveBeenCalled());
    expect(
      await screen.findByText('Settlement posted. Outstanding list updated.'),
    ).toBeInTheDocument();
  });

  it('conflict: settle stale surfaces dialog conflict', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue(directory());
    settleMock.mockRejectedValue(new ApiError('Stale', 409, 'STALE_STATE'));
    renderPage();
    await user.click(await screen.findByText('Ravi Kumar'));
    await user.click(await screen.findByRole('button', { name: 'Record repayment' }));
    await user.clear(screen.getByLabelText('Amount (₹)'));
    await user.type(screen.getByLabelText('Amount (₹)'), '50');
    await user.click(screen.getByRole('button', { name: 'Post settlement' }));
    expect(
      await screen.findByText(/khata balance changed on another till/i),
    ).toBeInTheDocument();
  });

  it('validation: overpayment surfaced as validation', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue(directory());
    settleMock.mockRejectedValue(new ApiError('Over', 422, 'OVERPAYMENT'));
    renderPage();
    await user.click(await screen.findByText('Ravi Kumar'));
    await user.click(await screen.findByRole('button', { name: 'Record repayment' }));
    await user.clear(screen.getByLabelText('Amount (₹)'));
    await user.type(screen.getByLabelText('Amount (₹)'), '500');
    await user.click(screen.getByRole('button', { name: 'Post settlement' }));
    expect(
      await screen.findByText('Enter a payoff amount in rupees and pick how they paid.'),
    ).toBeInTheDocument();
  });
});
