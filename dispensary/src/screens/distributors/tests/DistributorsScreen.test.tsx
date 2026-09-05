import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DistributorsScreen from '@/screens/distributors/DistributorsScreen';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';
import type { Supplier } from '@/services/suppliers';

vi.mock('@/services/suppliers', async () => {
  const axios = await import('@/services/axios');
  return {
    listSuppliers: vi.fn(),
    getSupplier: vi.fn(),
    createSupplier: vi.fn(),
    updateSupplier: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

vi.mock('@/services/productCategories', async () => {
  const axios = await import('@/services/axios');
  return {
    listProductCategories: vi.fn(),
    createProductCategory: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import { createSupplier, listSuppliers, updateSupplier } from '@/services/suppliers';
import { listProductCategories } from '@/services/productCategories';

const listMock = vi.mocked(listSuppliers);
const createMock = vi.mocked(createSupplier);
const updateMock = vi.mocked(updateSupplier);
const categoriesMock = vi.mocked(listProductCategories);

const sample: Supplier = {
  id: 's1',
  tenantId: 't1',
  supplierCode: 'SUP-0001',
  legalName: 'Acme Pharma Pvt Ltd',
  tradeName: 'Acme Distributors',
  supplierType: 'DISTRIBUTOR',
  gstin: '29ABCDE1234F1Z5',
  pan: 'ABCDE1234F',
  drugLicenseNumber: 'KA-WH-2026-11',
  drugLicenseType: 'WHOLESALE',
  drugLicenseExpiry: '2028-03-31',
  fssaiLicenseNumber: '11223344556677',
  licenseStatus: 'VALID',
  contactPersonName: 'Ramesh Rao',
  contactPersonRole: 'Sales',
  phone: '9876500001',
  alternatePhone: null,
  email: null,
  website: null,
  addressLine1: '12 MG Road',
  addressLine2: null,
  city: 'Bengaluru',
  state: 'KA',
  pincode: '560001',
  country: 'India',
  paymentTerms: 'CREDIT',
  creditPeriodDays: 30,
  creditLimitPaise: 25000000,
  bankName: 'HDFC',
  accountHolderName: 'Acme Pharma Pvt Ltd',
  accountNumber: '123456789012',
  ifscCode: 'HDFC0001234',
  upiId: null,
  categoryIds: [],
  status: 'ACTIVE',
  notes: null,
  createdAt: '2026-09-04T00:00:00Z',
  updatedAt: '2026-09-04T00:00:00Z',
  branchProcurement: {
    branchId: 'b1',
    branchName: 'Main counter',
    purchaseOrders: [],
  },
};

function renderPage(modules: string[] = ['PROCUREMENT', 'INVENTORY']) {
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
          activeBranchId: 'b1',
          branches: [{ id: 'b1', name: 'Main counter', branchCode: 'BR01', status: 'ACTIVE' }],
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

function fillRequired() {
  fireEvent.change(screen.getByLabelText('Supplier code'), { target: { value: 'SUP-0001' } });
  fireEvent.change(screen.getByLabelText('Legal name'), {
    target: { value: 'Acme Pharma Pvt Ltd' },
  });
  fireEvent.change(screen.getByLabelText('Contact person'), { target: { value: 'Ramesh Rao' } });
  fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '9876500001' } });
  fireEvent.change(screen.getByLabelText('Address line 1'), { target: { value: '12 MG Road' } });
  fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Bengaluru' } });
  fireEvent.change(screen.getByLabelText('State'), { target: { value: 'KA' } });
  fireEvent.change(screen.getByLabelText('PIN code'), { target: { value: '560001' } });
}

describe('floor supplier book', () => {
  beforeEach(() => {
    listMock.mockReset();
    createMock.mockReset();
    updateMock.mockReset();
    categoriesMock.mockReset();
    categoriesMock.mockResolvedValue([]);
  });

  it('loading: waits for suppliers', () => {
    listMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByText('Loading the supplier book for this pharmacy…')).toBeInTheDocument();
  });

  it('empty: no distributors yet', async () => {
    listMock.mockResolvedValue([]);
    renderPage();
    expect(
      await screen.findByText(
        'No distributors on file yet. Add the first stockist this pharmacy buys from.',
      ),
    ).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Distributors' })).toBeInTheDocument();
  });

  it('denied: till without purchases or accounts', () => {
    renderPage(['SALES']);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'This till login cannot open the supplier book. Ask the owner to grant Purchases or Accounts.',
    );
    expect(listMock).not.toHaveBeenCalled();
  });

  it('validation: required identity before save', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([]);
    renderPage();
    await screen.findByRole('heading', { name: 'Distributors' });
    await user.click(screen.getByRole('button', { name: 'Add supplier' }));
    await user.click(screen.getByRole('button', { name: 'Save supplier' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Code, legal name, contact, phone, and address are required before saving this supplier.',
    );
    expect(createMock).not.toHaveBeenCalled();
  });

  it('conflict: duplicate GSTIN stays on the book', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([]);
    createMock.mockRejectedValue(
      new ApiError('A supplier with this GSTIN already exists.', 409, 'GSTIN_TAKEN'),
    );
    renderPage();
    await screen.findByRole('heading', { name: 'Distributors' });
    await user.click(screen.getByRole('button', { name: 'Add supplier' }));
    fillRequired();
    fireEvent.click(screen.getByRole('button', { name: 'Save supplier' }));
    await waitFor(() => {
      expect(createMock).toHaveBeenCalled();
    });
    expect(await screen.findByRole('status')).toHaveTextContent(
      'That code or GSTIN is already on this pharmacy',
    );
  });

  it('failure: list network error', async () => {
    listMock.mockRejectedValue(new ApiError('Could not reach the server', 0, 'NETWORK'));
    renderPage();
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Could not reach the server for suppliers. Try again.',
    );
  });

  it('success: save supplier, show license and this-outlet history', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([]);
    createMock.mockResolvedValue(sample);
    renderPage();
    await screen.findByRole('heading', { name: 'Distributors' });
    await user.click(screen.getByRole('button', { name: 'Add supplier' }));
    fillRequired();
    fireEvent.click(screen.getByRole('button', { name: 'Save supplier' }));
    await waitFor(() => {
      expect(createMock).toHaveBeenCalled();
    });
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Supplier saved on this pharmacy’s book.',
    );
    expect(screen.getByRole('button', { name: /Acme Distributors/ })).toBeInTheDocument();
    expect(screen.getByTestId('license-status')).toHaveTextContent('License current');
    expect(
      screen.getByRole('heading', { name: 'Purchase orders at Main counter' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/No purchase orders from Main counter yet/)).toBeInTheDocument();
    expect(screen.queryByText(/rating/i)).not.toBeInTheDocument();
  });

  it('success: accountant with accounts can open the book', async () => {
    listMock.mockResolvedValue([sample]);
    renderPage(['FINANCE']);
    expect(await screen.findByRole('heading', { name: 'Distributors' })).toBeInTheDocument();
    expect(listMock).toHaveBeenCalled();
  });

  it('restores focus to Add supplier after cancel', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([]);
    renderPage();
    await screen.findByRole('heading', { name: 'Distributors' });
    await user.click(screen.getByRole('button', { name: 'Add supplier' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'Add supplier' })).toHaveFocus();
  });

  it('conflict: duplicate code on save changes', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([sample]);
    updateMock.mockRejectedValue(
      new ApiError('A supplier with this code already exists.', 409, 'CODE_TAKEN'),
    );
    renderPage();
    const row = await screen.findByRole('button', { name: /Acme Distributors/ });
    await user.click(row);
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'That code or GSTIN is already on this pharmacy',
    );
  });
});
