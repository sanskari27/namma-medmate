import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CreditScreen from '@/screens/credit/CreditScreen';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';

vi.mock('@/services/credit', async () => {
  const axios = await import('@/services/axios');
  return {
    listOutstandingCreditAccounts: vi.fn(),
    settleCustomerCredit: vi.fn(),
    formatPaise: (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`,
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import { listOutstandingCreditAccounts, settleCustomerCredit } from '@/services/credit';

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
};

function renderPage(modules: string[] = ['CRM']) {
  const store = configureStore({
    reducer: { auth: authReducer },
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
    listMock.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByRole('status')).toHaveTextContent(
      'No outstanding khata on this pharmacy yet.',
    );
  });

  it('denied: till without CRM', () => {
    renderPage(['SALES']);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'This till cannot open Credit / Khata. Ask the owner for CRM access.',
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
      .mockResolvedValueOnce([sample])
      .mockResolvedValueOnce([
        { ...sample, balancePaise: 7000, availablePaise: 43000, version: 3 },
      ]);
    settleMock.mockResolvedValue({
      customerId: 'c1',
      limitPaise: 50000,
      balancePaise: 7000,
      availablePaise: 43000,
      version: 3,
      entries: [],
    });
    renderPage();
    expect(await screen.findByRole('button', { name: /Ravi Kumar/ })).toBeInTheDocument();
    expect(screen.getByText(/due ₹120/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Settle' }));
    await screen.findByRole('dialog');
    await user.clear(screen.getByLabelText('Amount (₹)'));
    await user.type(screen.getByLabelText('Amount (₹)'), '50');
    await user.click(screen.getByRole('button', { name: 'Post settlement' }));
    await waitFor(() => expect(settleMock).toHaveBeenCalled());
    expect(
      await screen.findByText('Settlement posted. Outstanding list updated.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('conflict: settle stale surfaces dialog conflict', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([sample]);
    settleMock.mockRejectedValue(new ApiError('Stale', 409, 'STALE_STATE'));
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Settle' }));
    await user.clear(screen.getByLabelText('Amount (₹)'));
    await user.type(screen.getByLabelText('Amount (₹)'), '50');
    await user.click(screen.getByRole('button', { name: 'Post settlement' }));
    expect(
      await screen.findByText(
        'Khata balance changed on another till. Close and open settle again.',
      ),
    ).toBeInTheDocument();
  });

  it('validation: overpayment surfaced as validation', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([sample]);
    settleMock.mockRejectedValue(new ApiError('Over', 422, 'OVERPAYMENT'));
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Settle' }));
    await user.clear(screen.getByLabelText('Amount (₹)'));
    await user.type(screen.getByLabelText('Amount (₹)'), '500');
    await user.click(screen.getByRole('button', { name: 'Post settlement' }));
    expect(
      await screen.findByText('Enter a payoff amount in rupees and pick how they paid.'),
    ).toBeInTheDocument();
  });
});
