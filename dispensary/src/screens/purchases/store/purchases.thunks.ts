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
  createGoodsReceipt,
  createPurchaseOrder,
  issuePurchaseOrder,
} from '@/services/purchaseOrders';
import { listSuppliers, type Supplier } from '@/services/suppliers';
import type { RootState } from '@/store';
import { PURCHASES_CONTENT } from '../PurchasesScreen.content';
import {
  mapCreateError,
  mapLoadError,
  rupeesToPaise,
  toNumber,
  validateEntry,
  type CreateStatus,
  type PageStatus,
} from '../PurchasesScreen.utils';

type Reject = { status: PageStatus; message: string };
type CreateReject = { status: CreateStatus; message: string };

export const loadPurchases = createAsyncThunk<
  { items: GoodsReceiptSummary[]; suppliers: Supplier[]; products: Product[] },
  void,
  { rejectValue: Reject }
>('purchases/load', async (_, { rejectWithValue }) => {
  try {
    const [items, suppliers, products] = await Promise.all([
      listBranchGoodsReceipts(),
      listSuppliers().catch(() => [] as Supplier[]),
      listProducts().catch(() => [] as Product[]),
    ]);
    return {
      items,
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

  try {
    const lineInputs = draft.lines
      .filter((line) => line.productId && toNumber(line.quantity) + toNumber(line.freeQuantity) > 0)
      .map((line) => {
        const charged = toNumber(line.quantity);
        const free = toNumber(line.freeQuantity);
        const totalQty = charged + free;
        const chargedPaise = charged > 0 ? rupeesToPaise(line.rateRupees) * charged : 0;
        const unitRatePaise =
          totalQty > 0 && chargedPaise > 0 ? Math.round(chargedPaise / totalQty) : 0;
        return {
          productId: line.productId,
          quantity: totalQty,
          unitRatePaise,
        };
      });

    const created = await createPurchaseOrder({
      supplierId: draft.supplierId,
      expectedDeliveryDate: draft.invoiceDate || null,
      paymentTerms: 'CREDIT',
      notes: `Invoice ${draft.invoiceNo.trim()}`,
      idempotencyKey: crypto.randomUUID(),
      lines: lineInputs,
    });
    const issued = await issuePurchaseOrder(created.id, created.version);
    const receiptLines = issued.lines.map((line) => ({
      purchaseOrderLineId: line.id,
      quantity: toNumber(line.quantity),
      unitRatePaise: line.unitRatePaise,
    }));
    const receipt = await createGoodsReceipt(issued.id, {
      receiptReference: draft.invoiceNo.trim(),
      idempotencyKey: crypto.randomUUID(),
      lines: receiptLines,
    });

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
      return rejectWithValue({
        status: mapCreateError(error),
        message: error.message || PURCHASES_CONTENT.status.failure,
      });
    }
    return rejectWithValue({
      status: 'failure',
      message: PURCHASES_CONTENT.status.failure,
    });
  }
});
