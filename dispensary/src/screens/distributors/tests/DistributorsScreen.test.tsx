import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
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

import { listSupplierDues, listSuppliers } from '@/services/suppliers';

const listMock = vi.mocked(listSuppliers);
const duesMock = vi.mocked(listSupplierDues);

const acme = {
  id: 's1',
  legalName: 'Acme Pharma',
  tradeName: 'Acme',
  contactPersonName: 'Ravi',
  phone: '9876500001',
  gstin: '29ABCDE1234F1Z5',
  drugLicenseNumber: 'KA-W-1',
  paymentTerms: 'CREDIT',
  creditPeriodDays: 30,
  status: 'ACTIVE',
  outstandingPaise: 50000,
  productLineCount: 2,
} as Supplier;

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
    listMock.mockResolvedValue([]);
    duesMock.mockResolvedValue([]);
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
});
