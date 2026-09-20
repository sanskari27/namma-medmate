import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HospitalBillingScreen from '@/screens/hospital-billing/HospitalBillingScreen';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';
import type { HospitalAccount, HospitalPriceList } from '@/services/hospital';

vi.mock('@/services/hospital', () => ({
  getHospitalAccount: vi.fn(),
  getHospitalPrices: vi.fn(),
  saveHospitalAccount: vi.fn(),
  saveHospitalPrices: vi.fn(),
  isApiError: (error: unknown) => error instanceof ApiError,
}));

import {
  getHospitalAccount,
  getHospitalPrices,
  saveHospitalAccount,
  saveHospitalPrices,
} from '@/services/hospital';

const accountMock = vi.mocked(getHospitalAccount);
const pricesMock = vi.mocked(getHospitalPrices);
const saveAccountMock = vi.mocked(saveHospitalAccount);
const savePricesMock = vi.mocked(saveHospitalPrices);

const emptyAccount: HospitalAccount = {
  configured: false,
  id: null,
  institutionName: null,
  gstin: null,
  storesContact: null,
  billingPhone: null,
  billingEmail: null,
  creditTerms: null,
  creditLimitPaise: 0,
  balancePaise: 0,
  availableCreditPaise: 0,
  uniformDiscountBps: 0,
  pendingPriceListApprovalRequestId: null,
  version: 0,
};

const readyAccount: HospitalAccount = {
  ...emptyAccount,
  configured: true,
  id: 'a1',
  institutionName: 'City Care',
  creditTerms: 'NET_30',
  creditLimitPaise: 1000000,
  availableCreditPaise: 1000000,
  version: 1,
};

const priceList: HospitalPriceList = {
  uniformDiscountBps: 500,
  pendingApprovalRequestId: null,
  items: [
    {
      productId: 'p1',
      productName: 'Dolo',
      sku: 'SKU-1',
      mrpPaise: 10000,
      creditPricePaise: 9500,
      effectiveDiscountBps: 500,
      ruleType: null,
      ruleValue: null,
    },
  ],
};

function renderPage(modules: string[] = ['HOSPITAL']) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: {
          userId: 'u1',
          displayName: 'Varshmaan',
          role: 'pharmacy_owner',
          tenantId: 't1',
          modules,
          pinSet: true,
        },
      },
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <HospitalBillingScreen />
      </MemoryRouter>
    </Provider>,
  );
}

describe('HospitalBillingScreen', () => {
  beforeEach(() => {
    accountMock.mockReset();
    pricesMock.mockReset();
    saveAccountMock.mockReset();
    savePricesMock.mockReset();
  });

  it('loading: waits for hospital billing', () => {
    accountMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByRole('status')).toHaveTextContent('Loading hospital billing');
  });

  it('empty: prompts to set up bill-to institution', async () => {
    accountMock.mockResolvedValue(emptyAccount);
    renderPage();
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Set up the bill-to institution first',
    );
    expect(pricesMock).not.toHaveBeenCalled();
  });

  it('validation: institution name is required', async () => {
    const user = userEvent.setup();
    accountMock.mockResolvedValue(emptyAccount);
    renderPage();
    await screen.findByRole('status');
    await user.click(screen.getByRole('button', { name: 'Save account' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Institution name and credit terms are required',
    );
    expect(saveAccountMock).not.toHaveBeenCalled();
  });

  it('denied: staff cannot open hospital billing', async () => {
    accountMock.mockRejectedValue(new ApiError('Forbidden', 403, 'FORBIDDEN'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You cannot change hospital billing at this counter',
    );
  });

  it('conflict: stale account save', async () => {
    const user = userEvent.setup();
    accountMock.mockResolvedValue(readyAccount);
    pricesMock.mockResolvedValue(priceList);
    saveAccountMock.mockRejectedValue(new ApiError('stale', 409, 'STALE_STATE'));
    renderPage();
    expect(await screen.findByDisplayValue('City Care')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save account' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Someone else updated hospital billing',
    );
  });

  it('failure: cannot load hospital billing', async () => {
    accountMock.mockRejectedValue(new ApiError('down', 500, 'INTERNAL_ERROR'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load hospital billing. Try again.',
    );
  });

  it('success: saves bill-to institution and restores focus', async () => {
    const user = userEvent.setup();
    accountMock.mockResolvedValueOnce(emptyAccount).mockResolvedValue(readyAccount);
    pricesMock.mockResolvedValue(priceList);
    saveAccountMock.mockResolvedValue(readyAccount);
    renderPage();
    await screen.findByRole('status');
    const institution = screen.getByRole('textbox', { name: 'Bill-to institution' });
    await user.type(institution, 'City Care');
    const saveButton = screen.getByRole('button', { name: 'Save account' });
    await user.click(saveButton);
    expect(await screen.findByRole('status')).toHaveTextContent('Bill-to institution saved.');
    await waitFor(() => expect(saveButton).toHaveFocus());
  });

  it('plan_limit: shows upgrade link without hospital module', async () => {
    renderPage([]);
    expect(await screen.findByRole('alert')).toHaveTextContent('Hospital billing is on the Pro plan');
    expect(screen.getByRole('link', { name: 'Open the plan' })).toHaveAttribute(
      'href',
      '/subscription',
    );
    expect(accountMock).not.toHaveBeenCalled();
  });

  it('success: accountant price list waits on owner sign-off', async () => {
    const user = userEvent.setup();
    accountMock.mockResolvedValue(readyAccount);
    pricesMock.mockResolvedValue(priceList);
    savePricesMock.mockResolvedValue({
      status: 'PENDING_APPROVAL',
      approvalRequestId: 'req-1',
      priceList,
    });
    renderPage();
    const discount = await screen.findByRole('textbox', { name: 'Uniform discount (%)' });
    await user.clear(discount);
    await user.type(discount, '12');
    await user.click(screen.getByRole('button', { name: 'Save price list' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Price list sent for owner sign-off.',
    );
  });

  it('success: saves credit price list when account exists', async () => {
    const user = userEvent.setup();
    accountMock.mockResolvedValue(readyAccount);
    pricesMock.mockResolvedValue(priceList);
    savePricesMock.mockResolvedValue({
      status: 'APPLIED',
      approvalRequestId: null,
      priceList: { ...priceList, uniformDiscountBps: 1000 },
    });
    renderPage();
    const discount = await screen.findByRole('textbox', { name: 'Uniform discount (%)' });
    await user.clear(discount);
    await user.type(discount, '10');
    await user.click(screen.getByRole('button', { name: 'Save price list' }));
    expect(savePricesMock).toHaveBeenCalledWith({ uniformDiscountBps: 1000 });
    expect(await screen.findByRole('status')).toHaveTextContent('Credit price list saved.');
    expect(within(screen.getByRole('table')).getByText('Dolo')).toBeInTheDocument();
  });
});
