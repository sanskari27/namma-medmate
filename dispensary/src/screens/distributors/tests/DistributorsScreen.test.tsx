import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DistributorsScreen from '@/screens/distributors/DistributorsScreen';
import { distributorsReducer } from '@/screens/distributors/store/distributors.slice';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';
import type { Supplier } from '@/services/suppliers';

vi.mock('@/services/suppliers', async () => {
  const axios = await import('@/services/axios');
  return {
    listSuppliers: vi.fn(),
    listSupplierDues: vi.fn(),
    createSupplier: vi.fn(),
    updateSupplier: vi.fn(),
    getSupplierLedger: vi.fn(),
    recordSupplierPayment: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import {
  getSupplierLedger,
  listSupplierDues,
  listSuppliers,
  recordSupplierPayment,
} from '@/services/suppliers';

const listMock = vi.mocked(listSuppliers);
const duesMock = vi.mocked(listSupplierDues);
const ledgerMock = vi.mocked(getSupplierLedger);
const payMock = vi.mocked(recordSupplierPayment);

const acme = {
  id: 's1',
  supplierCode: 'SUP-ACME',
  legalName: 'Acme Pharma',
  tradeName: 'Acme',
  contactPersonName: 'Ravi',
  phone: '9876500001',
  email: 'acme@example.com',
  gstin: '29ABCDE1234F1Z5',
  pan: 'ABCDE1234F',
  drugLicenseNumber: 'KA-W-1',
  addressLine1: '12 MG Road',
  city: 'Bengaluru',
  state: 'KA',
  pincode: '560001',
  country: 'India',
  supplierType: 'DISTRIBUTOR',
  paymentTerms: 'CREDIT',
  creditPeriodDays: 30,
  creditLimitPaise: 10000000,
  bankName: 'HDFC Bank',
  categoryIds: [],
  status: 'ACTIVE',
  outstandingPaise: 50000,
  productLineCount: 2,
} as Supplier;

const ledger = {
  supplierId: 's1',
  supplierLegalName: 'Acme Pharma',
  balancePaise: 50000,
  version: 3,
  entries: [
    {
      id: 'e1',
      type: 'INVOICE' as const,
      amountPaise: 50000,
      balanceAfterPaise: 50000,
      goodsReceiptId: 'g1',
      purchaseReturnId: null,
      paymentMode: null,
      paymentReference: null,
      dueOn: '2026-09-15',
      occurredAt: '2026-09-01T04:30:00Z',
    },
  ],
};

function renderPage(modules: string[] = ['PROCUREMENT']) {
  const store = configureStore({
    reducer: { auth: authReducer, distributors: distributorsReducer },
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
          activeBranchId: 'b1',
        },
      },
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <DistributorsScreen />
      </MemoryRouter>
    </Provider>,
  );
}

describe('DistributorsScreen', () => {
  beforeEach(() => {
    listMock.mockReset();
    duesMock.mockReset();
    ledgerMock.mockReset();
    payMock.mockReset();
    listMock.mockResolvedValue([]);
    duesMock.mockResolvedValue([]);
    ledgerMock.mockResolvedValue(ledger);
    payMock.mockResolvedValue({ ...ledger, balancePaise: 0, entries: [] });
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  it('loading: waits for the directory', () => {
    listMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByText('Loading distributor directory…')).toBeInTheDocument();
  });

  it('empty: no distributors yet', async () => {
    renderPage();
    expect(await screen.findByText('No distributors yet')).toBeInTheDocument();
  });

  it('denied: purchases or accounts required', () => {
    renderPage(['SALES']);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Purchases or Accounts access is required to open the distributor directory.',
    );
    expect(listMock).not.toHaveBeenCalled();
  });

  it('failure: list network error', async () => {
    listMock.mockRejectedValue(new Error('network'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load distributors. Try again.');
  });

  it('success: shows directory and overdue dues', async () => {
    listMock.mockResolvedValue([acme]);
    duesMock.mockResolvedValue([
      {
        supplierId: 's1',
        legalName: 'Acme Pharma',
        balancePaise: 50000,
        dueOn: '2026-09-01',
        overdue: true,
      },
    ]);
    renderPage();
    expect(await screen.findByText('Acme Pharma')).toBeInTheDocument();
    expect(screen.getByText(/1 stockist due is overdue/)).toBeInTheDocument();
  });

  it('PLAN_LIMIT on dues links to the plan', async () => {
    listMock.mockResolvedValue([acme]);
    duesMock.mockRejectedValue(new ApiError('Growth', 422, 'PLAN_LIMIT'));
    renderPage();
    expect(await screen.findByText(/Stockist due reminders are on Growth/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open the plan' })).toHaveAttribute('href', '/subscription');
  });

  it('confirms payment against outstanding and lists ledger lines', async () => {
    const user = userEvent.setup();
    const confirm = vi.mocked(window.confirm);
    listMock.mockResolvedValue([acme]);
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Edit Acme Pharma' }));
    expect(screen.getByLabelText('PAN')).toBeInTheDocument();
    expect(screen.getByLabelText('Credit limit (₹)')).toBeInTheDocument();
    expect(screen.getByLabelText('Bank')).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'Record payment' }));
    expect(await screen.findByText(/Outstanding: ₹500/)).toBeInTheDocument();
    expect(screen.getByText(/INVOICE/)).toBeInTheDocument();
    expect(screen.getAllByText(/₹500/).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText('Amount (₹)'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('Reference'), { target: { value: 'UTR-1' } });
    confirm.mockReturnValueOnce(false);
    await user.click(screen.getByRole('button', { name: 'Post payment' }));
    expect(payMock).not.toHaveBeenCalled();
    confirm.mockReturnValueOnce(true);
    await user.click(screen.getByRole('button', { name: 'Post payment' }));
    await waitFor(() => expect(payMock).toHaveBeenCalledTimes(1));
    expect(confirm).toHaveBeenCalled();
    expect(payMock.mock.calls[0][1]).toMatchObject({
      amountPaise: 10000,
      reference: 'UTR-1',
      expectedAccountVersion: 3,
    });
  });
});
