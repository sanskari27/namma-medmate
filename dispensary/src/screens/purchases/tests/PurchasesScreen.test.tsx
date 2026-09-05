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
    previewReorderDrafts: vi.fn(),
    createFromReorder: vi.fn(),
    bulkPurchaseOrders: vi.fn(),
    getPurchaseOrderAnalytics: vi.fn(),
    listGoodsReceipts: vi.fn(),
    createGoodsReceipt: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

vi.mock('@/services/subscriptions', () => ({
  getCurrentSubscription: vi.fn(),
}));

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
  bulkPurchaseOrders,
  createFromReorder,
  createPurchaseOrder,
  getPurchaseOrderAnalytics,
  listGoodsReceipts,
  listPurchaseOrderVersions,
  listPurchaseOrders,
  previewReorderDrafts,
  updatePurchaseOrder,
} from '@/services/purchaseOrders';
import { getCurrentSubscription } from '@/services/subscriptions';
import { listSuppliers } from '@/services/suppliers';
import { listProducts } from '@/services/products';

const listMock = vi.mocked(listPurchaseOrders);
const createMock = vi.mocked(createPurchaseOrder);
const updateMock = vi.mocked(updatePurchaseOrder);
const versionsMock = vi.mocked(listPurchaseOrderVersions);
const suppliersMock = vi.mocked(listSuppliers);
const productsMock = vi.mocked(listProducts);
const subscriptionMock = vi.mocked(getCurrentSubscription);
const previewMock = vi.mocked(previewReorderDrafts);
const fromReorderMock = vi.mocked(createFromReorder);
const bulkMock = vi.mocked(bulkPurchaseOrders);
const analyticsMock = vi.mocked(getPurchaseOrderAnalytics);
const receiptsMock = vi.mocked(listGoodsReceipts);

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
    subscriptionMock.mockReset();
    subscriptionMock.mockResolvedValue({
      tenantId: 't1',
      planCode: 'GROWTH',
      status: 'ACTIVE',
      startedAt: '2026-09-01T00:00:00Z',
      expiresAt: null,
      branchLimitOverride: null,
      effectiveBranchLimit: 3,
      maxUsers: 5,
      usersUsed: 1,
      branchesUsed: 1,
      entitledModules: ['PROCUREMENT'],
    });
    previewMock.mockReset();
    fromReorderMock.mockReset();
    bulkMock.mockReset();
    analyticsMock.mockReset();
    receiptsMock.mockReset();
    receiptsMock.mockResolvedValue({
      purchaseOrderId: sample.id,
      poNumber: sample.poNumber,
      status: 'ISSUED',
      supplierId: sample.supplierId,
      supplierLegalName: sample.supplierLegalName,
      lines: [
        {
          purchaseOrderLineId: 'l1',
          productId: 'p1',
          productName: 'Crocin Advance',
          sku: 'CROCIN',
          orderedQuantity: 10,
          unitRatePaise: 10000,
          receivedQuantity: 0,
          remainingQuantity: 10,
        },
      ],
      receipts: [],
    });
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

  it('issued indent can record a stockist delivery', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([{ ...sample, status: 'ISSUED', version: 2 }]);
    renderPage();
    await user.click(await screen.findByRole('button', { name: /PO\/2026-27\/BR01\/00001/ }));
    expect(screen.getByRole('button', { name: 'Record delivery' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Record delivery' }));
    expect(await screen.findByRole('heading', { name: 'Record delivery' })).toBeInTheDocument();
    expect(screen.getByLabelText('Challan / invoice ref')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Back to indent' }));
    expect(screen.getByRole('button', { name: 'Record delivery' })).toHaveFocus();
  });

  it('draft indent has no record delivery action', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([sample]);
    renderPage();
    await user.click(await screen.findByRole('button', { name: /PO\/2026-27\/BR01\/00001/ }));
    expect(screen.queryByRole('button', { name: 'Record delivery' })).not.toBeInTheDocument();
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
      'Reorder numbers moved, or someone else saved this indent. Reload and try again.',
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

  it('loading: waits for reorder split', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([]);
    previewMock.mockReturnValue(new Promise(() => undefined));
    renderPage();
    await screen.findByRole('heading', { name: 'Purchases' });
    await user.click(screen.getByRole('button', { name: 'Draft from reorder' }));
    expect(screen.getByText('Reading this outlet’s reorder list…')).toBeInTheDocument();
  });

  it('empty: nothing below reorder', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([]);
    previewMock.mockRejectedValue(new ApiError('Nothing is below reorder', 422, 'REORDER_EMPTY'));
    renderPage();
    await screen.findByRole('heading', { name: 'Purchases' });
    await user.click(screen.getByRole('button', { name: 'Draft from reorder' }));
    expect(await screen.findByText('Nothing is below reorder on this outlet.')).toBeInTheDocument();
  });

  it('denied: free plan stays manual', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([]);
    previewMock.mockRejectedValue(new ApiError('Growth or Pro is required', 422, 'PLAN_LIMIT'));
    renderPage();
    await screen.findByRole('heading', { name: 'Purchases' });
    await user.click(screen.getByRole('button', { name: 'Draft from reorder' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This outlet’s plan still places indents by hand. Growth drafts from the reorder list.',
    );
  });

  it('conflict: stale reorder fingerprint', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([]);
    previewMock.mockResolvedValue({
      fingerprint: 'abc',
      planCode: 'GROWTH',
      drafts: [{ ...sample, id: '', poNumber: '', notes: 'Draft from outlet reorder' }],
      unmapped: [
        {
          productId: 'p2',
          sku: 'ORPH',
          name: 'Orphan pack',
          suggestedOrderQty: 10,
          reason: 'UNMAPPED',
        },
      ],
    });
    fromReorderMock.mockRejectedValue(new ApiError('Reorder list changed', 409, 'STALE_STATE'));
    renderPage();
    await screen.findByRole('heading', { name: 'Purchases' });
    await user.click(screen.getByRole('button', { name: 'Draft from reorder' }));
    await screen.findByText('Not on a stockist yet');
    await user.click(screen.getByRole('button', { name: 'Save as drafts' }));
    expect(
      await screen.findByText('Reorder numbers moved. Preview again before drafting.'),
    ).toBeInTheDocument();
  });

  it('failure: reorder preview network error', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([]);
    previewMock.mockRejectedValue(new ApiError('down', 0, 'NETWORK'));
    renderPage();
    await screen.findByRole('heading', { name: 'Purchases' });
    await user.click(screen.getByRole('button', { name: 'Draft from reorder' }));
    expect(
      await screen.findByText('Could not reach the server for reorder drafts. Try again.'),
    ).toBeInTheDocument();
  });

  it('success: save reorder split as drafts and restore focus', async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue([]);
    previewMock.mockResolvedValue({
      fingerprint: 'abc',
      planCode: 'GROWTH',
      drafts: [{ ...sample, id: '', poNumber: '', notes: 'Draft from outlet reorder' }],
      unmapped: [],
    });
    fromReorderMock.mockResolvedValue({
      fingerprint: 'abc',
      planCode: 'GROWTH',
      drafts: [sample],
      unmapped: [],
    });
    renderPage();
    await screen.findByRole('heading', { name: 'Purchases' });
    await user.click(screen.getByRole('button', { name: 'Draft from reorder' }));
    await user.click(await screen.findByRole('button', { name: 'Save as drafts' }));
    await waitFor(() => expect(fromReorderMock).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'Draft from reorder' })).toHaveFocus();
  });

  it('pro: issue selected drafts and show stockist spend', async () => {
    const user = userEvent.setup();
    subscriptionMock.mockResolvedValue({
      tenantId: 't1',
      planCode: 'PRO',
      status: 'ACTIVE',
      startedAt: '2026-09-01T00:00:00Z',
      expiresAt: null,
      branchLimitOverride: null,
      effectiveBranchLimit: 5,
      maxUsers: null,
      usersUsed: 1,
      branchesUsed: 1,
      entitledModules: ['PROCUREMENT'],
    });
    listMock.mockResolvedValue([sample]);
    analyticsMock.mockResolvedValue({
      totalSpendPaise: 0,
      suppliers: [],
    });
    bulkMock.mockResolvedValue([{ ...sample, status: 'ISSUED', version: 2 }]);
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Stockist spend' })).toBeInTheDocument();
    expect(screen.getByText('No issued or closed spend on this outlet yet.')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Select PO/2026-27/BR01/00001' }));
    await user.click(screen.getByRole('button', { name: 'Issue selected' }));
    await waitFor(() => expect(bulkMock).toHaveBeenCalled());
  });
});
