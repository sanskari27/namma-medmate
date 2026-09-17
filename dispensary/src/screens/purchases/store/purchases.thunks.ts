import { createAsyncThunk } from '@reduxjs/toolkit';
import { isApiError } from '@/services/axios';
import {
  getGoodsReceipt,
  listBranchGoodsReceipts,
  type GoodsReceiptDetail,
  type GoodsReceiptSummary,
} from '@/services/goodsReceipts';
import { listProducts, type Product } from '@/services/products';
import {
  createFromReorder,
  createGoodsReceipt,
  createPurchaseOrder,
  issuePurchaseOrder,
  listGoodsReceipts,
  listPurchaseOrders,
  previewReorderDrafts,
  receivePurchaseBill,
  type GoodsReceipts,
  type PurchaseOrder,
} from '@/services/purchaseOrders';
import { listSuppliers, type Supplier } from '@/services/suppliers';
import type { RootState } from '@/store';
import { PURCHASES_CONTENT } from '../PurchasesScreen.content';
import {
  BILL_IDEMPOTENCY_KEY,
  INDENT_IDEMPOTENCY_KEY,
  REORDER_IDEMPOTENCY_KEY,
  clearIdempotencyKey,
  deliveryIdempotencyKey,
  mapCreateError,
  mapLoadError,
  reuseIdempotencyKey,
  rupeesToPaise,
  toNumber,
  validateEntry,
  validateIndent,
  type CreateStatus,
  type PageStatus,
} from '../PurchasesScreen.utils';

type Reject = { status: PageStatus; message: string };
type CreateReject = { status: CreateStatus; message: string };

export const loadPurchases = createAsyncThunk<
  {
    items: GoodsReceiptSummary[];
    orders: PurchaseOrder[];
    suppliers: Supplier[];
    products: Product[];
  },
  void,
  { rejectValue: Reject }
>('purchases/load', async (_, { rejectWithValue }) => {
  try {
    const [items, orders, suppliers, products] = await Promise.all([
      listBranchGoodsReceipts(),
      listPurchaseOrders().catch(() => [] as PurchaseOrder[]),
      listSuppliers().catch(() => [] as Supplier[]),
      listProducts().catch(() => [] as Product[]),
    ]);
    return {
      items,
      orders,
      suppliers: suppliers.filter((row) => row.status === 'ACTIVE'),
      products: products.filter((row) => row.isActive && !row.isDiscontinued),
    };
  } catch (error) {
    if (isApiError(error)) {
      return rejectWithValue({
        status: mapLoadError(error),
        message: error.message || PURCHASES_CONTENT.loadFailed,
      });
    }
    return rejectWithValue({ status: 'failure', message: PURCHASES_CONTENT.loadFailed });
  }
});

export const loadPurchaseDetail = createAsyncThunk<
  GoodsReceiptDetail,
  string,
  { rejectValue: Reject }
>('purchases/detail', async (id, { rejectWithValue }) => {
  try {
    return await getGoodsReceipt(id);
  } catch (error) {
    if (isApiError(error)) {
      return rejectWithValue({
        status: mapLoadError(error),
        message: error.message || PURCHASES_CONTENT.loadFailed,
      });
    }
    return rejectWithValue({ status: 'failure', message: PURCHASES_CONTENT.loadFailed });
  }
});

function billLines(draft: RootState['purchases']['draft']) {
  return draft.lines
    .filter((line) => line.productId && toNumber(line.quantity) + toNumber(line.freeQuantity) > 0)
    .map((line) => ({
      productId: line.productId,
      quantity: toNumber(line.quantity),
      freeQuantity: toNumber(line.freeQuantity),
      unitRatePaise: rupeesToPaise(line.rateRupees),
    }));
}

export const createPurchaseEntry = createAsyncThunk<
  { summary: GoodsReceiptSummary; message: string },
  void,
  { state: RootState; rejectValue: CreateReject }
>('purchases/create', async (_, { getState, rejectWithValue }) => {
  const { draft } = getState().purchases;
  const validation = validateEntry(draft);
  if (validation) {
    return rejectWithValue({ status: 'validation', message: validation });
  }

  const key = reuseIdempotencyKey(BILL_IDEMPOTENCY_KEY);
  try {
    const supplier = getState().purchases.suppliers.find((row) => row.id === draft.supplierId);
    const result = await receivePurchaseBill({
      supplierId: draft.supplierId,
      expectedDeliveryDate: null,
      invoiceDate: draft.invoiceDate || null,
      paymentTerms: supplier?.paymentTerms ?? 'CREDIT',
      notes: `Invoice ${draft.invoiceNo.trim()}`,
      receiptReference: draft.invoiceNo.trim(),
      idempotencyKey: key,
      lines: billLines(draft),
    });
    clearIdempotencyKey(BILL_IDEMPOTENCY_KEY);

    const receipt = result.receipt;
    const issued = result.purchaseOrder;
    let summary: GoodsReceiptSummary | undefined;
    try {
      const items = await listBranchGoodsReceipts();
      summary = items.find((row) => row.id === receipt.id);
    } catch {
      summary = undefined;
    }
    if (!summary) {
      summary = {
        id: receipt.id,
        receiptNumber: receipt.receiptNumber,
        receiptReference: receipt.receiptReference,
        status: receipt.status,
        supplierLegalName: issued.supplierLegalName,
        createdAt: receipt.createdAt,
        checkedAt: null,
        purchaseOrderId: issued.id,
        lineCount: receipt.lines.length,
        unitCount: receipt.lines.reduce((sum, line) => sum + toNumber(line.quantity), 0),
        taxablePaise: issued.subtotalPaise,
        taxPaise: issued.taxPaise,
        totalPaise: issued.totalPaise,
      };
    }

    return { summary, message: PURCHASES_CONTENT.status.success };
  } catch (error) {
    if (isApiError(error)) {
      const status = mapCreateError(error);
      return rejectWithValue({
        status,
        message:
          status === 'conflict'
            ? PURCHASES_CONTENT.status.conflict
            : error.message || PURCHASES_CONTENT.status.failure,
      });
    }
    return rejectWithValue({
      status: 'failure',
      message: PURCHASES_CONTENT.status.failure,
    });
  }
});

export const createIndent = createAsyncThunk<
  { order: PurchaseOrder; message: string },
  void,
  { state: RootState; rejectValue: CreateReject }
>('purchases/indent', async (_, { getState, rejectWithValue }) => {
  const { draft } = getState().purchases;
  const validation = validateIndent(draft);
  if (validation) {
    return rejectWithValue({ status: 'validation', message: validation });
  }
  const key = reuseIdempotencyKey(INDENT_IDEMPOTENCY_KEY);
  try {
    const order = await createPurchaseOrder({
      supplierId: draft.supplierId,
      expectedDeliveryDate: draft.invoiceDate || null,
      paymentTerms: 'CREDIT',
      notes: draft.invoiceNo.trim() || undefined,
      idempotencyKey: key,
      lines: billLines(draft).flatMap((line) => {
        const rows: Array<{ productId: string; quantity: number; unitRatePaise: number }> = [];
        if (line.quantity > 0) {
          rows.push({
            productId: line.productId,
            quantity: line.quantity,
            unitRatePaise: line.unitRatePaise,
          });
        }
        if (line.freeQuantity > 0) {
          rows.push({
            productId: line.productId,
            quantity: line.freeQuantity,
            unitRatePaise: 0,
          });
        }
        return rows;
      }),
    });
    clearIdempotencyKey(INDENT_IDEMPOTENCY_KEY);
    return { order, message: 'Indent saved as a draft.' };
  } catch (error) {
    if (isApiError(error)) {
      return rejectWithValue({
        status: mapCreateError(error),
        message: error.message || PURCHASES_CONTENT.status.failure,
      });
    }
    return rejectWithValue({ status: 'failure', message: PURCHASES_CONTENT.status.failure });
  }
});

export const issueIndent = createAsyncThunk<
  PurchaseOrder,
  string,
  { state: RootState; rejectValue: CreateReject }
>('purchases/issue', async (id, { getState, rejectWithValue }) => {
  const order = getState().purchases.orders.find((row) => row.id === id);
  if (!order) {
    return rejectWithValue({ status: 'failure', message: PURCHASES_CONTENT.status.failure });
  }
  try {
    return await issuePurchaseOrder(order.id, order.version);
  } catch (error) {
    if (isApiError(error)) {
      return rejectWithValue({
        status: mapCreateError(error),
        message: error.message || PURCHASES_CONTENT.status.failure,
      });
    }
    return rejectWithValue({ status: 'failure', message: PURCHASES_CONTENT.status.failure });
  }
});

export const loadDelivery = createAsyncThunk<
  GoodsReceipts,
  string,
  { rejectValue: CreateReject }
>('purchases/loadDelivery', async (poId, { rejectWithValue }) => {
  try {
    return await listGoodsReceipts(poId);
  } catch (error) {
    if (isApiError(error)) {
      return rejectWithValue({
        status: mapCreateError(error),
        message: error.message || PURCHASES_CONTENT.status.failure,
      });
    }
    return rejectWithValue({ status: 'failure', message: PURCHASES_CONTENT.status.failure });
  }
});

export const recordDelivery = createAsyncThunk<
  { summary: GoodsReceiptSummary; order: PurchaseOrder; message: string },
  void,
  { state: RootState; rejectValue: CreateReject }
>('purchases/recordDelivery', async (_, { getState, rejectWithValue }) => {
  const { delivery } = getState().purchases;
  if (!delivery.outstanding || !delivery.poId) {
    return rejectWithValue({ status: 'validation', message: 'Pick an indent to receive against.' });
  }
  if (!delivery.receiptReference.trim()) {
    return rejectWithValue({ status: 'validation', message: 'Enter the distributor invoice no.' });
  }
  const lines = delivery.outstanding.lines
    .map((line) => ({
      purchaseOrderLineId: line.purchaseOrderLineId,
      quantity: toNumber(delivery.qtyByLineId[line.purchaseOrderLineId]),
      unitRatePaise: line.unitRatePaise,
      remaining: toNumber(line.remainingQuantity),
    }))
    .filter((line) => line.quantity > 0);
  if (lines.length === 0) {
    return rejectWithValue({ status: 'validation', message: 'Enter qty to receive on at least one line.' });
  }
  if (lines.some((line) => line.quantity > line.remaining)) {
    return rejectWithValue({ status: 'validation', message: 'Receive qty cannot exceed outstanding.' });
  }

  const key = reuseIdempotencyKey(deliveryIdempotencyKey(delivery.poId));
  try {
    const receipt = await createGoodsReceipt(delivery.poId, {
      receiptReference: delivery.receiptReference.trim(),
      idempotencyKey: key,
      lines: lines.map((line) => ({
        purchaseOrderLineId: line.purchaseOrderLineId,
        quantity: line.quantity,
        unitRatePaise: line.unitRatePaise,
      })),
    });
    clearIdempotencyKey(deliveryIdempotencyKey(delivery.poId));
    const outstanding = await listGoodsReceipts(delivery.poId);
    const summary: GoodsReceiptSummary = {
      id: receipt.id,
      receiptNumber: receipt.receiptNumber,
      receiptReference: receipt.receiptReference,
      status: receipt.status,
      supplierLegalName: outstanding.supplierLegalName,
      createdAt: receipt.createdAt,
      checkedAt: null,
      purchaseOrderId: outstanding.purchaseOrderId,
      lineCount: receipt.lines.length,
      unitCount: receipt.lines.reduce((sum, line) => sum + toNumber(line.quantity), 0),
      taxablePaise: 0,
      taxPaise: 0,
      totalPaise: 0,
    };
    const order: PurchaseOrder = {
      id: outstanding.purchaseOrderId,
      tenantId: '',
      branchId: '',
      supplierId: outstanding.supplierId,
      supplierLegalName: outstanding.supplierLegalName,
      poNumber: outstanding.poNumber,
      status: outstanding.status,
      expectedDeliveryDate: null,
      paymentTerms: 'CREDIT',
      notes: null,
      version: 0,
      subtotalPaise: 0,
      taxPaise: 0,
      totalPaise: 0,
      lines: [],
      createdAt: receipt.createdAt,
      updatedAt: receipt.createdAt,
    };
    return { summary, order, message: PURCHASES_CONTENT.status.success };
  } catch (error) {
    if (isApiError(error)) {
      return rejectWithValue({
        status: mapCreateError(error),
        message: error.message || PURCHASES_CONTENT.status.failure,
      });
    }
    return rejectWithValue({ status: 'failure', message: PURCHASES_CONTENT.status.failure });
  }
});

export const draftFromReorder = createAsyncThunk<
  { orders: PurchaseOrder[]; message: string },
  void,
  { rejectValue: CreateReject }
>('purchases/reorder', async (_, { rejectWithValue }) => {
  const key = reuseIdempotencyKey(REORDER_IDEMPOTENCY_KEY);
  try {
    const preview = await previewReorderDrafts();
    const result = await createFromReorder(key, preview.fingerprint);
    clearIdempotencyKey(REORDER_IDEMPOTENCY_KEY);
    const count = result.drafts.length;
    return {
      orders: result.drafts,
      message:
        count === 0
          ? 'Nothing to reorder at this outlet.'
          : `Drafted ${count} indent${count === 1 ? '' : 's'} from this outlet reorder.`,
    };
  } catch (error) {
    if (isApiError(error)) {
      const message =
        error.code === 'PLAN_LIMIT'
          ? PURCHASES_CONTENT.reorderDenied
          : error.message || PURCHASES_CONTENT.status.failure;
      return rejectWithValue({ status: mapCreateError(error), message });
    }
    return rejectWithValue({ status: 'failure', message: PURCHASES_CONTENT.status.failure });
  }
});
