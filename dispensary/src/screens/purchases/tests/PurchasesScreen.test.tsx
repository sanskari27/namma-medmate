import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PurchasesScreen from '@/screens/purchases/PurchasesScreen';
import { purchasesReducer } from '@/screens/purchases/store/purchases.slice';
import { ApiError } from '@/services/axios';
import { authReducer } from '@/store';
import type { Product } from '@/services/products';
import type { Supplier } from '@/services/suppliers';
import type { PurchaseOrder } from '@/services/purchaseOrders';
import type { GoodsReceiptSummary } from '@/services/goodsReceipts';

vi.mock('@/services/goodsReceipts', async () => {
  const axios = await import('@/services/axios');
  return {
    listBranchGoodsReceipts: vi.fn(),
    getGoodsReceipt: vi.fn(),
    ApiError: axios.ApiError,
    isApiError: axios.isApiError,
  };
});

vi.mock('@/services/purchaseOrders', async () => {
  const axios = await import('@/services/axios');
  return {
    listPurchaseOrders: vi.fn(),
    receivePurchaseBill: vi.fn(),
    createPurchaseOrder: vi.fn(),
    issuePurchaseOrder: vi.fn(),
    listGoodsReceipts: vi.fn(),
    createGoodsReceipt: vi.fn(),
    previewReorderDrafts: vi.fn(),
    createFromReorder: vi.fn(),
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

import { getGoodsReceipt, listBranchGoodsReceipts } from '@/services/goodsReceipts';
import { listProducts } from '@/services/products';
import {
  createFromReorder,
  createGoodsReceipt,
  createPurchaseOrder,
  issuePurchaseOrder,
  listGoodsReceipts,
  listPurchaseOrders,
  previewReorderDrafts,
  receivePurchaseBill,
} from '@/services/purchaseOrders';
import { listSuppliers } from '@/services/suppliers';

const listGrn = vi.mocked(listBranchGoodsReceipts);
const listPos = vi.mocked(listPurchaseOrders);
const listSup = vi.mocked(listSuppliers);
const listProd = vi.mocked(listProducts);
const receiveBill = vi.mocked(receivePurchaseBill);
const createPo = vi.mocked(createPurchaseOrder);
const issuePo = vi.mocked(issuePurchaseOrder);
const listOutstanding = vi.mocked(listGoodsReceipts);
const createGrn = vi.mocked(createGoodsReceipt);
const previewReorder = vi.mocked(previewReorderDrafts);
const fromReorder = vi.mocked(createFromReorder);
const getGrn = vi.mocked(getGoodsReceipt);

const supplier = {
  id: 's1',
  legalName: 'Acme Pharma',
  status: 'ACTIVE',
  paymentTerms: 'COD',
} as Supplier;

const product = {
  id: 'p1',
  name: 'Paracetamol 500',
  packDescription: '10s',
  isActive: true,
  isDiscontinued: false,
  gstRate: 12,
} as Product;

const grn: GoodsReceiptSummary = {
  id: 'grn1',
  receiptNumber: 'GRN/1',
  receiptReference: 'BPD/1',
  status: 'PENDING_QC',
  supplierLegalName: 'Acme Pharma',
  createdAt: '2026-09-16T10:00:00Z',
  checkedAt: null,
  purchaseOrderId: 'po1',
  lineCount: 2,
  unitCount: 12,
  taxablePaise: 100000,
  taxPaise: 12000,
  totalPaise: 112000,
};

const draftPo = {
  id: 'po-d',
  poNumber: 'PO/1',
  status: 'DRAFT',
  supplierId: 's1',
  supplierLegalName: 'Acme Pharma',
  version: 1,
  totalPaise: 100000,
} as PurchaseOrder;

function renderPage(modules: string[] = ['PROCUREMENT'], activeBranchId: string | null = 'b1') {
  const store = configureStore({
    reducer: { auth: authReducer, purchases: purchasesReducer },
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
          activeBranchId,
          branches: [{ id: 'b1', name: 'Main', branchCode: 'BR01', status: 'ACTIVE' }],
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

async function fillBill(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'New purchase entry' }));
  fireEvent.change(screen.getByLabelText('Distributor / supplier'), { target: { value: 's1' } });
  fireEvent.change(screen.getByLabelText('Invoice no.'), { target: { value: 'BPD/1' } });
  fireEvent.change(screen.getByLabelText('Product'), { target: { value: 'p1' } });
  fireEvent.change(screen.getByLabelText('Qty'), { target: { value: '10' } });
  fireEvent.change(screen.getByLabelText('Free'), { target: { value: '2' } });
  fireEvent.change(screen.getByLabelText('Rate / PTR'), { target: { value: '100' } });
}

describe('PurchasesScreen', () => {
  beforeEach(() => {
    sessionStorage.clear();
    listGrn.mockReset();
    listPos.mockReset();
    listSup.mockReset();
    listProd.mockReset();
    receiveBill.mockReset();
    createPo.mockReset();
    issuePo.mockReset();
    listOutstanding.mockReset();
    createGrn.mockReset();
    previewReorder.mockReset();
    fromReorder.mockReset();
    getGrn.mockReset();
    listGrn.mockResolvedValue([]);
    listPos.mockResolvedValue([]);
    listSup.mockResolvedValue([supplier]);
    listProd.mockResolvedValue([product]);
  });

  it('loading: waits for purchase bills', () => {
    listGrn.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByText('Loading purchase bills at this outlet…')).toBeInTheDocument();
  });

  it('empty: no purchase bills yet', async () => {
    renderPage();
    expect(await screen.findByText('No purchase bills yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'New indent' })).toBeInTheDocument();
  });

  it('denied: purchases module required', () => {
    renderPage(['SALES']);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Purchases module is required to record goods inward.',
    );
    expect(listGrn).not.toHaveBeenCalled();
  });

  it('no branch: select an outlet', () => {
    renderPage(['PROCUREMENT'], null);
    expect(screen.getByRole('alert')).toHaveTextContent('Select an outlet before opening Purchases.');
  });

  it('validation: distributor invoice and qty before save', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'New purchase entry' }));
    fireEvent.change(screen.getByLabelText('Product'), { target: { value: 'p1' } });
    fireEvent.change(screen.getByLabelText('Qty'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Rate / PTR'), { target: { value: '100' } });
    await user.click(screen.getByRole('button', { name: 'Save & receive goods' }));
    expect(screen.getByRole('status')).toHaveTextContent('Pick a distributor.');
    expect(receiveBill).not.toHaveBeenCalled();
  });

  it('conflict: duplicate invoice ref', async () => {
    const user = userEvent.setup();
    receiveBill.mockRejectedValue(new ApiError('dup', 409, 'DUPLICATE_RECEIPT'));
    renderPage();
    await fillBill(user);
    await user.click(screen.getByRole('button', { name: 'Save & receive goods' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'This invoice ref was already recorded at this outlet. Use a different challan / invoice no.',
    );
  });

  it('failure: list network error', async () => {
    listGrn.mockRejectedValue(new Error('network'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load purchase bills. Try again.');
  });

  it('success: one receive-bill call with charged qty and free qty, reused key', async () => {
    const user = userEvent.setup();
    receiveBill.mockResolvedValue({
      purchaseOrder: { id: 'po1', supplierLegalName: 'Acme Pharma', subtotalPaise: 100000, taxPaise: 12000, totalPaise: 112000 },
      receipt: {
        id: 'grn1',
        receiptNumber: 'GRN/1',
        receiptReference: 'BPD/1',
        status: 'PENDING_QC',
        createdAt: '2026-09-16T10:00:00Z',
        lines: [],
      },
    } as Awaited<ReturnType<typeof receivePurchaseBill>>);
    listGrn.mockResolvedValueOnce([]).mockResolvedValue([grn]);
    renderPage();
    await fillBill(user);
    await user.click(screen.getByRole('button', { name: 'Save & receive goods' }));
    await waitFor(() => expect(receiveBill).toHaveBeenCalledTimes(1));
    expect(receiveBill.mock.calls[0][0]).toMatchObject({
      supplierId: 's1',
      receiptReference: 'BPD/1',
      paymentTerms: 'COD',
      expectedDeliveryDate: null,
      invoiceDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      lines: [{ productId: 'p1', quantity: 10, freeQuantity: 2, unitRatePaise: 10000 }],
    });
    expect(receiveBill.mock.calls[0][0].expectedDeliveryDate).not.toBe(
      receiveBill.mock.calls[0][0].invoiceDate,
    );
    expect(createPo).not.toHaveBeenCalled();
    expect(await screen.findByText('Open pharmacist check')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open pharmacist check' })).toHaveAttribute(
      'href',
      '/inventory?view=qc&receiptId=grn1',
    );
  });

  it('saves a draft indent on the open-indents desk', async () => {
    const user = userEvent.setup();
    createPo.mockResolvedValue(draftPo);
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'New indent' }));
    fireEvent.change(screen.getByLabelText('Distributor / supplier'), { target: { value: 's1' } });
    fireEvent.change(screen.getByLabelText('Product'), { target: { value: 'p1' } });
    fireEvent.change(screen.getByLabelText('Qty'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('Rate / PTR'), { target: { value: '100' } });
    await user.click(screen.getByRole('button', { name: 'Save indent' }));
    await waitFor(() => expect(createPo).toHaveBeenCalled());
    expect(await screen.findByText('PO/1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Issue indent' })).toBeInTheDocument();
  });

  it('records a partial delivery against outstanding', async () => {
    const user = userEvent.setup();
    listPos.mockResolvedValue([{ ...draftPo, status: 'ISSUED' }]);
    listOutstanding.mockResolvedValue({
      purchaseOrderId: 'po-d',
      poNumber: 'PO/1',
      status: 'ISSUED',
      supplierId: 's1',
      supplierLegalName: 'Acme Pharma',
      lines: [
        {
          purchaseOrderLineId: 'pol1',
          productId: 'p1',
          productName: 'Paracetamol 500',
          sku: 'SKU-PARA',
          orderedQuantity: 10,
          unitRatePaise: 10000,
          receivedQuantity: 0,
          remainingQuantity: 10,
        },
      ],
      receipts: [],
    });
    createGrn.mockResolvedValue({
      id: 'grn2',
      receiptNumber: 'GRN/2',
      receiptReference: 'CH-2',
      status: 'PENDING_QC',
      createdAt: '2026-09-16T10:00:00Z',
      lines: [{ purchaseOrderLineId: 'pol1', productId: 'p1', productName: 'Paracetamol 500', sku: 'SKU', quantity: 4, unitRatePaise: 10000 }],
    });
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Open indents' }));
    await user.click(await screen.findByRole('button', { name: 'Record delivery' }));
    fireEvent.change(await screen.findByLabelText('Invoice no.'), { target: { value: 'CH-2' } });
    fireEvent.change(screen.getByLabelText('Receive qty Paracetamol 500'), { target: { value: '4' } });
    await user.click(screen.getByRole('button', { name: 'Receive this delivery' }));
    await waitFor(() => expect(createGrn).toHaveBeenCalled());
    expect(createGrn.mock.calls[0][1].lines[0]).toMatchObject({
      purchaseOrderLineId: 'pol1',
      quantity: 4,
    });
  });

  it('PLAN_LIMIT on reorder points to the plan', async () => {
    const user = userEvent.setup();
    previewReorder.mockRejectedValue(new ApiError('Growth', 422, 'PLAN_LIMIT'));
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Draft from this outlet reorder' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Reorder drafts need Growth.');
    expect(screen.getByRole('link', { name: 'Open the plan' })).toHaveAttribute('href', '/subscription');
  });
});
