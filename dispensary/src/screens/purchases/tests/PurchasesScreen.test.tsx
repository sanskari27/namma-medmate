import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PurchasesScreen from '@/screens/purchases/PurchasesScreen';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';
import type { PurchaseOrder } from '@/services/purchaseOrders';
import type { Supplier } from '@/services/suppliers';
import type { Product } from '@/services/products';

vi.mock('@/services/purchaseOrders', async () => {
  const axios = await import('@/services/axios');
  return {
    listPurchaseOrders: vi.fn(),
    getPurchaseOrder: vi.fn(),
    listPurchaseOrderVersions: vi.fn(),
    createPurchaseOrder: vi.fn(),
    updatePurchaseOrder: vi.fn(),
    issuePurchaseOrder: vi.fn(),
    closePurchaseOrder: vi.fn(),
    cancelPurchaseOrder: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

vi.mock('@/services/suppliers', async () => {
  const axios = await import('@/services/axios');
  return {
    listSuppliers: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

vi.mock('@/services/products', async () => {
  const axios = await import('@/services/axios');
  return {
    listProducts: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

import {
  createPurchaseOrder,
  listPurchaseOrderVersions,
  listPurchaseOrders,
  updatePurchaseOrder,
} from '@/services/purchaseOrders';
import { listSuppliers } from '@/services/suppliers';
import { listProducts } from '@/services/products';

const listMock = vi.mocked(listPurchaseOrders);
const createMock = vi.mocked(createPurchaseOrder);
const updateMock = vi.mocked(updatePurchaseOrder);
const versionsMock = vi.mocked(listPurchaseOrderVersions);
const suppliersMock = vi.mocked(listSuppliers);
const productsMock = vi.mocked(listProducts);

const sample: PurchaseOrder = {
  id: 'po1',
  tenantId: 't1',
  branchId: 'b1',
  supplierId: 's1',
  supplierLegalName: 'Acme Pharma Pvt Ltd',
  poNumber: 'PO/2026-27/BR01/00001',
  status: 'DRAFT',
  expectedDeliveryDate: '2026-09-20',
  paymentTerms: 'CREDIT',
  notes: 'Weekly indent',
  version: 1,
  subtotalPaise: 100000,
  taxPaise: 12000,
  totalPaise: 112000,
  lines: [
    {
      id: 'l1',
      productId: 'p1',
      productName: 'Crocin Advance',
      sku: 'CROCIN',
      quantity: 10,
      unitRatePaise: 10000,
      gstRate: 12,
      lineSubtotalPaise: 100000,
      lineTaxPaise: 12000,
      lineTotalPaise: 112000,
    },
  ],
  createdAt: '2026-09-05T00:00:00Z',
  updatedAt: '2026-09-05T00:00:00Z',
};

const supplier: Supplier = {
  id: 's1',
  tenantId: 't1',
  supplierCode: 'SUP-0001',
  legalName: 'Acme Pharma Pvt Ltd',
  tradeName: 'Acme Distributors',
  supplierType: 'DISTRIBUTOR',
  gstin: null,
  pan: null,
  drugLicenseNumber: null,
  drugLicenseType: null,
  drugLicenseExpiry: null,
  fssaiLicenseNumber: null,
  licenseStatus: 'MISSING',
  contactPersonName: 'Ramesh Rao',
  contactPersonRole: null,
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
  creditLimitPaise: null,
  bankName: null,
  accountHolderName: null,
  accountNumber: null,
  ifscCode: null,
  upiId: null,
  categoryIds: [],
  status: 'ACTIVE',
  notes: null,
  createdAt: '2026-09-04T00:00:00Z',
  updatedAt: '2026-09-04T00:00:00Z',
  branchProcurement: { branchId: 'b1', branchName: 'Main counter', purchaseOrders: [] },
};

const product = {
  id: 'p1',
  sku: 'CROCIN',
  name: 'Crocin Advance',
  isActive: true,
  isDiscontinued: false,
} as Product;

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
        <PurchasesScreen />
      </MemoryRouter>
    </Provider>,
  );
}

describe('outlet purchase orders', () => {
  beforeEach(() => {
    listMock.mockReset();
    createMock.mockReset();
    updateMock.mockReset();
    versionsMock.mockReset();
    suppliersMock.mockReset();
    productsMock.mockReset();
    suppliersMock.mockResolvedValue([supplier]);
    productsMock.mockResolvedValue([product]);
    versionsMock.mockResolvedValue([]);
  });

  it('loading: waits for outlet indents', () => {
    listMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByText('Loading purchase orders for this outlet…')).toBeInTheDocument();
  });

  it('empty: no indents yet', async () => {
    listMock.mockResolvedValue([]);
    renderPage();
    expect(
      await screen.findByText('No indents on this outlet yet. Start one for a single stockist.'),
    ).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Purchases' })).toBeInTheDocument();
  });

  it('denied: till without purchases', () => {
    renderPage(['SALES']);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'This till login cannot place purchase orders. Ask the owner to grant Purchases.',
    );
    expect(listMock).not.toHaveBeenCalled();
  });

  it('validation: stockist and a priced pack required', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([]);
    renderPage();
    await screen.findByRole('heading', { name: 'Purchases' });
    await user.click(screen.getByRole('button', { name: 'New indent' }));
    await user.click(screen.getByRole('button', { name: 'Save indent' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Pick one stockist and at least one pack with quantity and agreed rate.',
    );
    expect(createMock).not.toHaveBeenCalled();
  });

  it('restores focus to New indent after back to list', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([]);
    renderPage();
    await screen.findByRole('heading', { name: 'Purchases' });
    await user.click(screen.getByRole('button', { name: 'New indent' }));
    await user.click(screen.getByRole('button', { name: 'Back to list' }));
    expect(screen.getByRole('button', { name: 'New indent' })).toHaveFocus();
  });

  it('closed indent freezes pack quantities', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([{ ...sample, status: 'CLOSED' }]);
    renderPage();
    await user.click(await screen.findByRole('button', { name: /PO\/2026-27\/BR01\/00001/ }));
    expect(screen.queryByRole('button', { name: 'Save revision' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Qty')).toBeDisabled();
    expect(screen.getByLabelText('Pack')).toBeDisabled();
  });

  it('conflict: stale version stays on the indent', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([sample]);
    versionsMock.mockResolvedValue([
      {
        version: 1,
        createdAt: sample.createdAt,
        changedByUserId: 'u1',
        status: 'DRAFT',
        totalPaise: 112000,
        snapshot: {
          lines: [
            {
              productId: 'p1',
              productName: 'Crocin Advance',
              sku: 'CROCIN',
              quantity: '10',
              unitRatePaise: 10000,
              lineTotalPaise: 112000,
            },
          ],
        },
      },
    ]);
    updateMock.mockRejectedValue(
      new ApiError('Purchase order was updated by someone else.', 409, 'STALE_STATE'),
    );
    renderPage();
    await user.click(await screen.findByRole('button', { name: /PO\/2026-27\/BR01\/00001/ }));
    await user.click(await screen.findByRole('button', { name: 'Save revision' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Someone else saved this indent. Reload the list and try again.',
    );
  });

  it('failure: list network error', async () => {
    listMock.mockRejectedValue(new ApiError('Could not reach the server', 0, 'NETWORK'));
    renderPage();
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Could not reach the server for purchase orders. Try again.',
    );
  });

  it('success: save indent and compare versions', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([]);
    createMock.mockResolvedValue(sample);
    versionsMock.mockResolvedValue([
      {
        version: 1,
        createdAt: sample.createdAt,
        changedByUserId: 'u1',
        status: 'DRAFT',
        totalPaise: 112000,
        snapshot: {
          lines: [
            {
              productId: 'p1',
              productName: 'Crocin Advance',
              sku: 'CROCIN',
              quantity: '10',
              unitRatePaise: 10000,
              lineTotalPaise: 112000,
            },
          ],
        },
      },
    ]);
    renderPage();
    await screen.findByRole('heading', { name: 'Purchases' });
    await user.click(screen.getByRole('button', { name: 'New indent' }));
    fireEvent.change(screen.getByLabelText('Stockist'), { target: { value: 's1' } });
    fireEvent.change(screen.getByLabelText('Pack'), { target: { value: 'p1' } });
    fireEvent.change(screen.getByLabelText('Qty'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Rate ₹'), { target: { value: '100' } });
    await user.click(screen.getByRole('button', { name: 'Save indent' }));
    await waitFor(() => {
      expect(createMock).toHaveBeenCalled();
    });
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Outlet indent saved. Totals and version updated.',
    );
    expect(screen.getAllByText(/PO\/2026-27\/BR01\/00001/).length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Earlier save')).toBeInTheDocument();
  });
});
