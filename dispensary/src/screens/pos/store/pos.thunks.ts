import { createAsyncThunk } from '@reduxjs/toolkit';
import { getCustomerCredit } from '@/services/credit';
import { getCustomer, listCustomers, type Customer } from '@/services/customers';
import { listDoctors, type Doctor } from '@/services/doctors';
import { listStockBatches } from '@/services/inventory';
import { isApiError } from '@/services/axios';
import { evaluateMedicationSafety, type SafetyEvaluation } from '@/services/medicationSafety';
import { listProductCategories, type ProductCategory } from '@/services/productCategories';
import { convertProductUnit, listProductUnits } from '@/services/productUnits';
import type { ProductUnit } from '@/services/products';
import {
  catalogueItemToProduct,
  listSalesCatalogue,
  type SalesCatalogueItem,
} from '@/services/salesCatalogue';
import {
  adjustInvoiceTax,
  applyInvoiceOffers,
  applyInvoicePricing,
  attachInvoicePrescription,
  completeSalesInvoice,
  createSalesInvoice,
  downloadInvoicePdf,
  emailInvoiceCopy,
  getSalesInvoice,
  getPrescriptionFulfillment,
  holdSalesInvoice,
  listInvoiceOffers,
  listSalesInvoices,
  openInvoicePdf,
  resumeSalesInvoice,
  updateSalesInvoice,
  type DiscountType,
  type InvoiceOfferItem,
  type PrescriptionFulfillmentItem,
  type SalesInvoice,
  type SalesInvoiceLine,
} from '@/services/salesInvoices';
import {
  collectiblePaise,
  getCustomerLoyalty,
  maxRedeemPoints,
  parseRedeemPoints,
  type CustomerLoyalty,
} from '@/services/loyalty';
import type { AppDispatch, RootState } from '@/store';
import type { PosDraftLine } from '../pos.types';
import {
  clearPendingPrescriptionFile,
  peekPendingPrescriptionFile,
} from '../pos.prescriptionFile';
import { POS_CONTENT } from '../PosScreen.content';
import {
  collectStatusHint,
  holdStatusHint,
  offerStatusHint,
  isControlledProduct,
  isPrescriptionProduct,
  mapApiStatus,
  paiseToRupees,
  percentToBps,
  previewTender,
  resumeStatusHint,
  rupeesToPaise,
  rxStatusHint,
  type PageStatus,
} from '../PosScreen.utils';

export type PosReject = {
  status: PageStatus;
  hint: string | null;
  invoice?: SalesInvoice;
};

function toReject(error: unknown, hintFallback?: string | null): PosReject {
  if (!isApiError(error)) {
    return { status: 'failure', hint: hintFallback ?? null };
  }
  const status = mapApiStatus(error);
  const hint = collectStatusHint(status, error.code) ?? hintFallback ?? null;
  return { status, hint };
}

function toDraftReject(error: unknown): PosReject {
  if (!isApiError(error)) {
    return { status: 'failure', hint: POS_CONTENT.status.failure };
  }
  const status = mapApiStatus(error);
  if (status === 'conflict') {
    return { status, hint: POS_CONTENT.status.conflict };
  }
  if (status === 'failure') {
    return { status, hint: POS_CONTENT.status.failure };
  }
  return { status, hint: collectStatusHint(status, error.code) ?? POS_CONTENT.status.failure };
}

function toOfferReject(error: unknown): PosReject {
  if (!isApiError(error)) {
    return { status: 'failure', hint: POS_CONTENT.offer.failure };
  }
  const status = mapApiStatus(error);
  return { status, hint: offerStatusHint(status, error.code) };
}

function lineDiscountValue(line: PosDraftLine): number | null {
  if (line.discountType === 'PERCENT') {
    return percentToBps(line.discountRupees);
  }
  return rupeesToPaise(line.discountRupees) ?? 0;
}

function buildPricingRequest(
  state: RootState['pos'],
  expectedVersion: number,
): {
  expectedVersion: number;
  customerGstin: string | null;
  billDiscountType: DiscountType;
  billDiscountValue: number;
  lines: { productId: string; type: DiscountType; value: number }[];
} | null {
  const billDiscountValue =
    state.billType === 'PERCENT'
      ? percentToBps(state.billValue)
      : (rupeesToPaise(state.billValue) ?? 0);
  const lines = state.draft.map((line) => {
    const value = lineDiscountValue(line);
    return {
      productId: line.product.id,
      type: line.discountType,
      value: value ?? 0,
      invalid: value == null,
    };
  });
  if (billDiscountValue == null || lines.some((line) => line.invalid)) {
    return null;
  }
  return {
    expectedVersion,
    customerGstin: state.customerGstin.trim() || null,
    billDiscountType: state.billValue.trim() ? state.billType : 'NONE',
    billDiscountValue: state.billValue.trim() ? billDiscountValue : 0,
    lines: lines.map((line) => ({
      productId: line.productId,
      type: line.type,
      value: line.value,
    })),
  };
}

function linePayload(draft: PosDraftLine[]) {
  const lines = [];
  for (const line of draft) {
    const quantity = Number(line.quantity);
    const mrpPaise = rupeesToPaise(line.mrpRupees);
    const sellingPricePaise = rupeesToPaise(line.sellingRupees);
    if (
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      mrpPaise == null ||
      sellingPricePaise == null
    ) {
      return null;
    }
    lines.push({
      productId: line.product.id,
      batchId: line.batchId,
      quantity,
      unit: line.unit,
      mrpPaise,
      sellingPricePaise,
      discountPaise: rupeesToPaise(line.discountRupees) ?? 0,
      prescribedQuantity: isPrescriptionProduct(line.product)
        ? Number(line.prescribedQuantity)
        : undefined,
    });
  }
  return lines.length === 0 ? null : lines;
}

function packPaise(item: SalesCatalogueItem): number | null {
  return item.suggestedSellingPaise ?? item.suggestedMrpPaise ?? null;
}

function factorFor(
  factors: Partial<Record<ProductUnit, number>>,
  unit: ProductUnit,
  item: SalesCatalogueItem,
): number {
  const explicit = factors[unit];
  if (explicit != null && Number.isFinite(explicit) && explicit > 0) {
    return explicit;
  }
  if (unit === item.baseUnit) {
    return 1;
  }
  if (unit === item.packUnit) {
    return Number(item.packSize) > 0 ? Number(item.packSize) : 1;
  }
  return 1;
}

function priceForUnit(
  item: SalesCatalogueItem,
  unit: ProductUnit,
  factors: Partial<Record<ProductUnit, number>> = {},
): { mrpRupees: string; sellingRupees: string } {
  const pack = packPaise(item);
  if (pack == null) {
    return { mrpRupees: '', sellingRupees: '' };
  }
  const packFactor = factorFor(factors, item.packUnit, item);
  const unitFactor = factorFor(factors, unit, item);
  const unitPaise = Math.max(0, Math.round((pack * unitFactor) / packFactor));
  const mrpPack = item.suggestedMrpPaise ?? pack;
  const mrpPaise = Math.max(0, Math.round((mrpPack * unitFactor) / packFactor));
  return {
    mrpRupees: paiseToRupees(mrpPaise),
    sellingRupees: paiseToRupees(unitPaise),
  };
}

function resolveSaleUnit(
  item: SalesCatalogueItem,
  mode: 'pack' | 'loose',
  unitOptions: ProductUnit[],
): ProductUnit {
  if (mode === 'loose') {
    return item.baseUnit;
  }
  if (item.packUnit !== item.baseUnit && unitOptions.includes(item.packUnit)) {
    return item.packUnit;
  }
  return item.packUnit !== item.baseUnit ? item.packUnit : item.baseUnit;
}

async function loadUnitMeta(productId: string, product: ReturnType<typeof catalogueItemToProduct>) {
  let unitOptions: ProductUnit[] = [product.baseUnit];
  const unitFactors: Partial<Record<ProductUnit, number>> = {
    [product.baseUnit]: 1,
    [product.packUnit]: Number(product.packSize) > 0 ? Number(product.packSize) : 1,
  };
  try {
    const units = await listProductUnits(productId);
    unitOptions = [
      units.baseUnit,
      ...units.units.map((row) => row.unit).filter((u) => u !== units.baseUnit),
    ];
    unitFactors[units.baseUnit] = 1;
    for (const row of units.units) {
      unitFactors[row.unit] = Number(row.factorToBase);
    }
    if (product.packUnit && !unitOptions.includes(product.packUnit)) {
      unitOptions = [...unitOptions, product.packUnit];
    }
    unitOptions = unitOptions.filter((value, index, all) => all.indexOf(value) === index);
  } catch {
    unitOptions = [product.baseUnit, product.packUnit].filter(
      (value, index, all) => all.indexOf(value) === index,
    );
  }
  return { unitOptions, unitFactors };
}

async function buildDraftLine(
  item: SalesCatalogueItem,
  mode: 'pack' | 'loose' = 'pack',
): Promise<PosDraftLine> {
  const product = catalogueItemToProduct(item);
  const { unitOptions, unitFactors } = await loadUnitMeta(product.id, product);
  let unit = resolveSaleUnit(item, mode, unitOptions);
  if (!unitOptions.includes(unit)) {
    unit = mode === 'loose' ? product.baseUnit : (unitOptions[0] ?? product.baseUnit);
  }
  let batches: PosDraftLine['batches'] = [];
  let batchId: string | null = null;
  let nearExpiry = false;
  if (product.requiresBatchTracking) {
    try {
      batches = await listStockBatches(product.id);
      const suggested =
        batches.find((b) => b.suggestedFefo && b.batchId && !b.expired) ??
        batches.find((b) => b.batchId && !b.expired && b.quantity > 0);
      batchId = suggested?.batchId ?? null;
      nearExpiry = suggested?.nearExpiry === true;
    } catch {
      batches = [];
    }
  }
  let baseQuantity: number | null = null;
  try {
    const converted = await convertProductUnit(product.id, { quantity: 1, fromUnit: unit });
    baseQuantity = converted.baseQuantity;
  } catch {
    baseQuantity = factorFor(unitFactors, unit, item);
  }
  const prices = priceForUnit(item, unit, unitFactors);
  return {
    id: crypto.randomUUID(),
    product,
    unit,
    quantity: '1',
    baseQuantity,
    unitOptions,
    unitFactors,
    batches,
    batchId,
    nearExpiry,
    mrpRupees: prices.mrpRupees,
    sellingRupees: prices.sellingRupees,
    discountRupees: '',
    discountType: 'FLAT',
    prescribedQuantity: '',
  };
}

async function buildDraftLineFromInvoiceLine(
  line: SalesInvoiceLine,
  catalogueById: Map<string, SalesCatalogueItem>,
): Promise<PosDraftLine | null> {
  let item = catalogueById.get(line.productId);
  if (!item) {
    const found = await listSalesCatalogue({ q: line.sku || line.productName });
    item = found.find((row) => row.id === line.productId) ?? found[0];
  }
  if (!item) {
    return null;
  }
  const product = catalogueItemToProduct(item);
  const { unitOptions, unitFactors } = await loadUnitMeta(product.id, product);
  let unit = line.unit;
  if (!unitOptions.includes(unit)) {
    unit = unitOptions[0] ?? product.baseUnit;
  }
  let batches: PosDraftLine['batches'] = [];
  let nearExpiry = false;
  if (product.requiresBatchTracking) {
    try {
      batches = await listStockBatches(product.id);
      nearExpiry = batches.some((batch) => batch.batchId === line.batchId && batch.nearExpiry);
    } catch {
      batches = [];
    }
  }
  const discountType: DiscountType =
    line.discountType === 'PERCENT' || line.discountType === 'FLAT' ? line.discountType : 'FLAT';
  const discountRupees =
    discountType === 'PERCENT'
      ? String((line.discountValue ?? 0) / 100)
      : (paiseToRupees(line.discountValue || line.discountPaise) ?? '');
  return {
    id: crypto.randomUUID(),
    product,
    unit,
    quantity: String(line.quantity),
    baseQuantity: Number(line.baseQuantity) || null,
    unitOptions,
    unitFactors,
    batches,
    batchId: line.batchId,
    nearExpiry,
    mrpRupees: paiseToRupees(line.mrpPaise) ?? '',
    sellingRupees: paiseToRupees(line.sellingPricePaise) ?? '',
    discountRupees,
    discountType,
    prescribedQuantity:
      line.prescribedQuantity != null && line.prescribedQuantity !== ''
        ? String(line.prescribedQuantity)
        : isPrescriptionProduct(product)
          ? '1'
          : '',
  };
}

function billValueFromInvoice(invoice: SalesInvoice): { billType: DiscountType; billValue: string } {
  const type =
    invoice.billDiscountType === 'PERCENT' || invoice.billDiscountType === 'FLAT'
      ? invoice.billDiscountType
      : 'FLAT';
  if (!invoice.billDiscountValue) {
    return { billType: 'FLAT', billValue: '' };
  }
  if (type === 'PERCENT') {
    return { billType: 'PERCENT', billValue: String(invoice.billDiscountValue / 100) };
  }
  return { billType: 'FLAT', billValue: paiseToRupees(invoice.billDiscountValue) ?? '' };
}

export const loadBootstrap = createAsyncThunk<
  {
    catalogue: SalesCatalogueItem[];
    categories: ProductCategory[];
    customers: Customer[];
    doctors: Doctor[];
  },
  void,
  { state: RootState; rejectValue: PosReject }
>('pos/loadBootstrap', async (_, { getState, rejectWithValue }) => {
  const { allowed } = getState().pos;
  if (!allowed) {
    return rejectWithValue({ status: 'denied', hint: null });
  }
  try {
    const [catalogue, categories, customers, doctors] = await Promise.all([
      listSalesCatalogue(),
      listProductCategories().catch(() => [] as ProductCategory[]),
      listCustomers().catch(() => [] as Customer[]),
      listDoctors().catch(() => [] as Doctor[]),
    ]);
    return { catalogue, categories, customers, doctors };
  } catch (error) {
    return rejectWithValue(toReject(error));
  }
});

export const loadHeldBills = createAsyncThunk<SalesInvoice[], void, { state: RootState }>(
  'pos/loadHeldBills',
  async (_, { getState }) => {
    if (!getState().pos.allowed) {
      return [];
    }
    try {
      const result = await listSalesInvoices({ status: 'HELD' });
      return result.items;
    } catch {
      return [];
    }
  },
);

export const loadRxFulfillment = createAsyncThunk<
  PrescriptionFulfillmentItem[],
  void,
  { state: RootState; rejectValue: PosReject }
>('pos/loadRxFulfillment', async (_, { getState, rejectWithValue }) => {
  const { prescriptionReference, selectedCustomer } = getState().pos;
  const reference = prescriptionReference.trim();
  if (!reference || !selectedCustomer) {
    return [];
  }
  try {
    const result = await getPrescriptionFulfillment(reference, selectedCustomer.id);
    return result.items;
  } catch (error) {
    if (isApiError(error)) {
      const status = mapApiStatus(error);
      return rejectWithValue({
        status,
        hint: rxStatusHint(status, error.code) ?? POS_CONTENT.rxCheckFailure,
      });
    }
    return rejectWithValue({
      status: 'failure',
      hint: POS_CONTENT.rxCheckFailure,
    });
  }
});

export type ContinueInvoiceResult = {
  invoice: SalesInvoice;
  draft: PosDraftLine[];
  customer: Customer | null;
  walkIn: boolean;
  doctors: Doctor[];
  billType: DiscountType;
  billValue: string;
  statusHint: string;
};

export const continueInvoice = createAsyncThunk<
  ContinueInvoiceResult,
  string,
  { state: RootState; rejectValue: PosReject }
>('pos/continueInvoice', async (invoiceId, { getState, rejectWithValue }) => {
  const { allowed } = getState().pos;
  if (!allowed) {
    return rejectWithValue({ status: 'denied', hint: null });
  }
  try {
    let invoice = await getSalesInvoice(invoiceId);
    const wasHeld = invoice.status === 'HELD';
    if (wasHeld) {
      invoice = await resumeSalesInvoice(invoiceId, { expectedVersion: invoice.version });
    }
    if (invoice.status !== 'DRAFT') {
      return rejectWithValue({
        status: 'validation',
        hint: POS_CONTENT.resume.notOpen,
      });
    }

    const [catalogue, doctors] = await Promise.all([
      listSalesCatalogue(),
      getState().pos.doctors.length > 0
        ? Promise.resolve(getState().pos.doctors)
        : listDoctors().catch(() => [] as Doctor[]),
    ]);
    const catalogueById = new Map(catalogue.map((item) => [item.id, item]));
    const draft: PosDraftLine[] = [];
    for (const line of invoice.lines) {
      const built = await buildDraftLineFromInvoiceLine(line, catalogueById);
      if (built) {
        draft.push(built);
      }
    }

    let customer: Customer | null = null;
    let walkIn = false;
    if (invoice.customerId) {
      try {
        customer = await getCustomer(invoice.customerId);
      } catch {
        customer = null;
        walkIn = true;
      }
    } else {
      walkIn = true;
    }

    const bill = billValueFromInvoice(invoice);
    const statusHint = resumeStatusHint(
      invoice.invoiceNumber,
      invoice.revalidation ?? null,
      wasHeld ? 'held' : 'draft',
    );

    return {
      invoice,
      draft,
      customer,
      walkIn,
      doctors,
      billType: bill.billType,
      billValue: bill.billValue,
      statusHint,
    };
  } catch (error) {
    return rejectWithValue(toReject(error, POS_CONTENT.resume.failure));
  }
});

export const searchCatalogue = createAsyncThunk<
  SalesCatalogueItem[],
  void,
  { state: RootState; rejectValue: PosReject }
>('pos/searchCatalogue', async (_, { getState, rejectWithValue }) => {
  const { productQuery, categoryFilterId, allowed } = getState().pos;
  if (!allowed) {
    return rejectWithValue({ status: 'denied', hint: null });
  }
  try {
    return await listSalesCatalogue({
      q: productQuery.trim() || undefined,
      categoryId: categoryFilterId === 'all' ? undefined : categoryFilterId,
    });
  } catch (error) {
    return rejectWithValue(toReject(error));
  }
});

export const searchCustomers = createAsyncThunk<
  Customer[],
  void,
  { state: RootState; rejectValue: PosReject }
>('pos/searchCustomers', async (_, { getState, rejectWithValue }) => {
  const { customerQuery, allowed } = getState().pos;
  if (!allowed) {
    return rejectWithValue({ status: 'denied', hint: null });
  }
  try {
    return await listCustomers(customerQuery.trim() || undefined);
  } catch (error) {
    return rejectWithValue(toReject(error));
  }
});

export type AddProductInput =
  | SalesCatalogueItem
  | string
  | { item: SalesCatalogueItem; mode?: 'pack' | 'loose' };

export const addProduct = createAsyncThunk<
  PosDraftLine | { lineId: string; increment: true } | null,
  AddProductInput,
  { state: RootState; rejectValue: PosReject }
>('pos/addProduct', async (input, { getState, rejectWithValue }) => {
  const state = getState().pos;
  let item: SalesCatalogueItem | undefined;
  let mode: 'pack' | 'loose' = 'pack';
  if (typeof input === 'string') {
    item = state.catalogue.find((row) => row.id === input);
  } else if ('item' in input) {
    item = input.item;
    mode = input.mode ?? 'pack';
  } else {
    item = input;
  }
  if (!item) {
    return rejectWithValue({ status: 'validation', hint: POS_CONTENT.thunk.medicineNotFound });
  }
  const desiredUnit =
    mode === 'loose'
      ? item.baseUnit
      : item.packUnit !== item.baseUnit
        ? item.packUnit
        : item.baseUnit;
  const existing = state.draft.find(
    (line) => line.product.id === item!.id && line.unit === desiredUnit,
  );
  if (existing) {
    return { lineId: existing.id, increment: true };
  }
  try {
    return await buildDraftLine(item, mode);
  } catch (error) {
    return rejectWithValue(toReject(error));
  }
});

export const changeLineUnit = createAsyncThunk<
  {
    lineId: string;
    unit: ProductUnit;
    mrpRupees: string;
    sellingRupees: string;
    baseQuantity: number | null;
    mergeIntoLineId?: string;
  },
  { lineId: string; unit: ProductUnit },
  { state: RootState; rejectValue: PosReject }
>('pos/changeLineUnit', async ({ lineId, unit }, { getState, rejectWithValue }) => {
  const state = getState().pos;
  const line = state.draft.find((row) => row.id === lineId);
  const item = line ? state.catalogue.find((row) => row.id === line.product.id) : undefined;
  if (!line || !item) {
    return rejectWithValue({ status: 'validation', hint: POS_CONTENT.thunk.lineNotFound });
  }
  const sibling = state.draft.find(
    (row) =>
      row.id !== lineId &&
      row.product.id === line.product.id &&
      row.unit === unit &&
      row.batchId === line.batchId,
  );
  const prices = priceForUnit(item, unit, line.unitFactors);
  let baseQuantity: number | null = null;
  try {
    const converted = await convertProductUnit(line.product.id, {
      quantity: Number(line.quantity) || 1,
      fromUnit: unit,
    });
    baseQuantity = converted.baseQuantity;
  } catch {
    baseQuantity = factorFor(line.unitFactors, unit, item) * (Number(line.quantity) || 1);
  }
  return {
    lineId,
    unit,
    mrpRupees: prices.mrpRupees || line.mrpRupees,
    sellingRupees: prices.sellingRupees || line.sellingRupees,
    baseQuantity,
    mergeIntoLineId: sibling?.id,
  };
});

export const scanBarcode = createAsyncThunk<
  { matched: boolean },
  void,
  { state: RootState; rejectValue: PosReject; dispatch: AppDispatch }
>('pos/scanBarcode', async (_, { getState, dispatch, rejectWithValue }) => {
  const { barcodeQuery, allowed } = getState().pos;
  const code = barcodeQuery.trim();
  if (!allowed || !code) {
    return { matched: false };
  }
  try {
    const items = await listSalesCatalogue({ barcode: code });
    if (items.length === 0) {
      return rejectWithValue({
        status: 'validation',
        hint: POS_CONTENT.thunk.barcodeMiss,
      });
    }
    await dispatch(addProduct(items[0]));
    return { matched: true };
  } catch (error) {
    return rejectWithValue(toReject(error));
  }
});

export const loadInvoiceOffers = createAsyncThunk<
  InvoiceOfferItem[],
  string,
  { rejectValue: PosReject }
>('pos/loadInvoiceOffers', async (invoiceId, { rejectWithValue }) => {
  try {
    const result = await listInvoiceOffers(invoiceId);
    return result?.items ?? [];
  } catch (error) {
    return rejectWithValue(toOfferReject(error));
  }
});

export const applyOffers = createAsyncThunk<
  SalesInvoice,
  void,
  { state: RootState; rejectValue: PosReject }
>('pos/applyOffers', async (_, { getState, rejectWithValue }) => {
  const { invoice } = getState().pos;
  if (!invoice) {
    return rejectWithValue({
      status: 'validation',
      hint: POS_CONTENT.offer.validation,
    });
  }
  try {
    return await applyInvoiceOffers(invoice.id, { expectedVersion: invoice.version });
  } catch (error) {
    return rejectWithValue(toOfferReject(error));
  }
});

export const saveInvoice = createAsyncThunk<
  { invoice: SalesInvoice; advanceToPayment: boolean; evaluation: SafetyEvaluation | null },
  { advanceToPayment?: boolean } | void,
  { state: RootState; rejectValue: PosReject }
>('pos/saveInvoice', async (arg, { getState, rejectWithValue }) => {
  const advanceToPayment = Boolean(arg && 'advanceToPayment' in arg && arg.advanceToPayment);
  const state = getState().pos;
  const lines = linePayload(state.draft);
  if (!lines) {
    return rejectWithValue({
      status: 'validation',
      hint: POS_CONTENT.thunk.needPrices,
    });
  }
  const controlledDraft = state.draft.some((line) => isControlledProduct(line.product));
  const prescriptionDraft = state.draft.some((line) => isPrescriptionProduct(line.product));
  if (!state.walkIn && !state.selectedCustomer) {
    return rejectWithValue({
      status: 'validation',
      hint: POS_CONTENT.thunk.needCustomer,
    });
  }
  if (controlledDraft && !state.canDispense) {
    return rejectWithValue({ status: 'denied', hint: null });
  }
  if (
    controlledDraft &&
    (!state.selectedCustomer || !state.selectedDoctorId || !state.prescriptionVerified)
  ) {
    return rejectWithValue({
      status: 'validation',
      hint: POS_CONTENT.thunk.controlledNeeds,
    });
  }
  if (
    state.draft.some((line) => line.product.requiresBatchTracking && !line.batchId)
  ) {
    return rejectWithValue({
      status: 'validation',
      hint: POS_CONTENT.thunk.needBatch,
    });
  }
  if (prescriptionDraft) {
    const prescribedOk = state.draft
      .filter((line) => isPrescriptionProduct(line.product))
      .every((line) => Number(line.prescribedQuantity) > 0);
    if (!state.prescriptionVerified || !state.selectedDoctorId || !state.prescriptionReference.trim() || !prescribedOk) {
      return rejectWithValue({
        status: 'validation',
        hint: POS_CONTENT.thunk.rxNeeds,
      });
    }
  }
  try {
    const payload = {
      customerId: state.selectedCustomer?.id ?? null,
      doctorId: state.selectedDoctorId || null,
      prescriptionReference: state.prescriptionReference.trim() || null,
      prescriptionVerified: state.prescriptionVerified,
      lines,
    };
    const open = state.invoice && state.invoice.status !== 'COMPLETED' ? state.invoice : null;
    const saved = open
      ? await updateSalesInvoice(open.id, {
          ...payload,
          expectedVersion: open.version,
        })
      : await createSalesInvoice({ ...payload, idempotencyKey: state.createKey });
    const rxFile = peekPendingPrescriptionFile();
    let withRx = saved;
    if (rxFile) {
      withRx = await attachInvoicePrescription(saved.id, rxFile);
      clearPendingPrescriptionFile();
    }
    const pricing = buildPricingRequest(state, withRx.version);
    if (!pricing) {
      return rejectWithValue({ status: 'validation', hint: null });
    }
    const priced = await applyInvoicePricing(withRx.id, pricing);
    let withOffers = priced;
    try {
      const offered = await applyInvoiceOffers(priced.id, { expectedVersion: priced.version });
      if (offered) {
        withOffers = offered;
      }
    } catch (error) {
      return rejectWithValue({ ...toOfferReject(error), invoice: priced });
    }
    const productIds = [...new Set(state.draft.map((line) => line.product.id))];
    const evaluation = await evaluateMedicationSafety(
      state.selectedCustomer?.id ?? null,
      productIds,
    );
    return { invoice: withOffers, advanceToPayment, evaluation };
  } catch (error) {
    return rejectWithValue(toDraftReject(error));
  }
});

export const applyPricing = createAsyncThunk<
  SalesInvoice,
  void,
  { state: RootState; rejectValue: PosReject }
>('pos/applyPricing', async (_, { getState, rejectWithValue }) => {
  const state = getState().pos;
  if (!state.invoice) {
    return rejectWithValue({ status: 'validation', hint: null });
  }
  const pricing = buildPricingRequest(state, state.invoice.version);
  if (!pricing) {
    return rejectWithValue({ status: 'validation', hint: null });
  }
  try {
    return await applyInvoicePricing(state.invoice.id, pricing);
  } catch (error) {
    return rejectWithValue(toReject(error));
  }
});

export const collectPayment = createAsyncThunk<
  SalesInvoice,
  void,
  { state: RootState; rejectValue: PosReject; dispatch: AppDispatch }
>('pos/collectPayment', async (_, { getState, dispatch, rejectWithValue }) => {
  let state = getState().pos;
  if (!state.invoice) {
    const saved = await dispatch(saveInvoice());
    if (saveInvoice.rejected.match(saved)) {
      return rejectWithValue(saved.payload ?? { status: 'validation', hint: null });
    }
    state = getState().pos;
  }
  if (!state.invoice || state.invoice.status === 'COMPLETED') {
    return rejectWithValue({
      status: 'validation',
      hint: collectStatusHint('validation'),
    });
  }
  const creditPaise = previewTender(
    collectiblePaise(state.invoice.totalPaise, parseRedeemPoints(state.redeemPoints) ?? 0),
    state.tender,
  ).parts.find((part) => part.mode === 'CREDIT')?.amountPaise ?? 0;
  if (creditPaise > 0 && (state.walkIn || !state.selectedCustomer)) {
    return rejectWithValue({
      status: 'validation',
      hint: collectStatusHint('validation', 'KHATA_REQUIRES_CUSTOMER'),
    });
  }
  const warnings = state.evaluation?.warnings ?? [];
  if (warnings.length > 0 && !state.reason.trim()) {
    return rejectWithValue({
      status: 'validation',
      hint: POS_CONTENT.safety.needReason,
    });
  }
  if (warnings.length > 0 && (state.walkIn || !state.selectedCustomer)) {
    return rejectWithValue({
      status: 'validation',
      hint: POS_CONTENT.safety.needCustomer,
    });
  }
  const points = parseRedeemPoints(state.redeemPoints);
  if (points == null) {
    return rejectWithValue({
      status: 'validation',
      hint: collectStatusHint('validation'),
    });
  }
  if (points > 0 && (state.walkIn || !state.selectedCustomer)) {
    return rejectWithValue({
      status: 'validation',
      hint: POS_CONTENT.collect.loyaltyCustomer,
    });
  }
  if (points > maxRedeemPoints(state.invoice.totalPaise)) {
    return rejectWithValue({
      status: 'validation',
      hint: POS_CONTENT.collect.redeemLimit,
    });
  }
  if (state.loyaltyBalancePoints != null && points > state.loyaltyBalancePoints) {
    return rejectWithValue({
      status: 'validation',
      hint: POS_CONTENT.collect.insufficientPoints,
    });
  }
  const duePaise = collectiblePaise(state.invoice.totalPaise, points);
  const preview = previewTender(duePaise, state.tender);
  if (preview.invalid || preview.parts.length === 0 || preview.remainingPaise > 0) {
    return rejectWithValue({
      status: 'validation',
      hint: collectStatusHint('validation'),
    });
  }
  const cashPaise = preview.parts.find((part) => part.mode === 'CASH')?.amountPaise ?? 0;
  if (preview.changePaise > cashPaise) {
    return rejectWithValue({
      status: 'validation',
      hint: collectStatusHint('validation'),
    });
  }
  try {
    const pricing = buildPricingRequest(state, state.invoice.version);
    let invoice = state.invoice;
    if (pricing) {
      invoice = await applyInvoicePricing(invoice.id, pricing);
    }
    try {
      const offered = await applyInvoiceOffers(invoice.id, { expectedVersion: invoice.version });
      if (offered) {
        invoice = offered;
      }
    } catch (error) {
      return rejectWithValue(toOfferReject(error));
    }
    const due = collectiblePaise(invoice.totalPaise, points);
    const finalPreview = previewTender(due, getState().pos.tender);
    return await completeSalesInvoice(invoice.id, {
      expectedVersion: invoice.version,
      expectedTotalPaise: invoice.totalPaise,
      changePaise: finalPreview.changePaise,
      idempotencyKey: state.completeKey,
      payments: finalPreview.parts,
      redeemPoints: points,
      safetyWarningKeys: warnings.map((warning) => warning.warningKey),
      safetyReason: state.reason.trim() || null,
    });
  } catch (error) {
    if (isApiError(error)) {
      if (error.code === 'UNLINKED_CUSTOMER') {
        return rejectWithValue({
          status: 'validation',
          hint: POS_CONTENT.safety.needCustomer,
        });
      }
      if (error.status === 422 && (error.message ?? '').includes('Warning keys')) {
        return rejectWithValue({
          status: 'conflict',
          hint: POS_CONTENT.status.conflict,
        });
      }
      if (error.status === 422 && (error.message ?? '').includes('review reason')) {
        return rejectWithValue({
          status: 'validation',
          hint: POS_CONTENT.safety.needReason,
        });
      }
    }
    return rejectWithValue(toReject(error, POS_CONTENT.collect.failure));
  }
});

export const holdBill = createAsyncThunk<
  SalesInvoice,
  void,
  { state: RootState; rejectValue: PosReject; dispatch: AppDispatch }
>('pos/holdBill', async (_, { getState, dispatch, rejectWithValue }) => {
  let state = getState().pos;
  if (!state.invoice || state.invoice.status === 'COMPLETED') {
    const saved = await dispatch(saveInvoice());
    if (saveInvoice.rejected.match(saved)) {
      return rejectWithValue(
        saved.payload ?? { status: 'validation', hint: holdStatusHint('validation') },
      );
    }
    state = getState().pos;
  }
  if (!state.invoice || state.invoice.status === 'COMPLETED') {
    return rejectWithValue({
      status: 'validation',
      hint: holdStatusHint('validation'),
    });
  }
  try {
    return await holdSalesInvoice(state.invoice.id, {
      expectedVersion: state.invoice.version,
    });
  } catch (error) {
    const next = isApiError(error) ? mapApiStatus(error) : 'failure';
    return rejectWithValue({
      status: next,
      hint: holdStatusHint(next) ?? holdStatusHint('failure'),
    });
  }
});

export const loadCustomerCredit = createAsyncThunk<number | null, string>(
  'pos/loadCustomerCredit',
  async (customerId) => {
    try {
      const credit = await getCustomerCredit(customerId);
      return credit.availablePaise;
    } catch {
      return null;
    }
  },
);

export const loadCustomerLoyalty = createAsyncThunk<
  CustomerLoyalty | null,
  string,
  { state: RootState; rejectValue: PosReject }
>('pos/loadCustomerLoyalty', async (customerId, { getState, rejectWithValue }) => {
  if (!getState().pos.loyaltyEntitled) {
    return null;
  }
  try {
    return await getCustomerLoyalty(customerId);
  } catch {
    return rejectWithValue({
      status: 'failure',
      hint: POS_CONTENT.loyalty.loadFailure,
    });
  }
});

export const adjustTax = createAsyncThunk<
  SalesInvoice,
  void,
  { state: RootState; rejectValue: PosReject }
>('pos/adjustTax', async (_, { getState, rejectWithValue }) => {
  const state = getState().pos;
  if (!state.invoice) {
    return rejectWithValue({
      status: 'validation',
      hint: POS_CONTENT.offer.validation,
    });
  }
  if (!state.taxProductId) {
    return rejectWithValue({
      status: 'validation',
      hint: POS_CONTENT.gst.needReason,
    });
  }
  if (!state.taxReason.trim()) {
    return rejectWithValue({
      status: 'validation',
      hint: POS_CONTENT.gst.needReason,
    });
  }
  const gstRate = Number(state.taxRate);
  if (!Number.isFinite(gstRate) || gstRate < 0) {
    return rejectWithValue({
      status: 'validation',
      hint: POS_CONTENT.gst.needReason,
    });
  }
  try {
    return await adjustInvoiceTax(state.invoice.id, {
      expectedVersion: state.invoice.version,
      reason: state.taxReason.trim(),
      lines: [{ productId: state.taxProductId, gstRate }],
    });
  } catch (error) {
    return rejectWithValue(toReject(error));
  }
});

export const printInvoice = createAsyncThunk<
  void,
  void,
  { state: RootState; rejectValue: PosReject }
>('pos/printInvoice', async (_, { getState, rejectWithValue }) => {
  const invoice = getState().pos.invoice;
  if (!invoice || invoice.status !== 'COMPLETED') {
    return rejectWithValue({
      status: 'validation',
      hint: POS_CONTENT.invoiceOutput.empty,
    });
  }
  try {
    const blob = await downloadInvoicePdf(invoice.id);
    openInvoicePdf(blob, `${invoice.invoiceNumber}.pdf`, true);
  } catch {
    return rejectWithValue({
      status: 'failure',
      hint: POS_CONTENT.invoiceOutput.failure,
    });
  }
});

export const emailCopy = createAsyncThunk<
  void,
  void,
  { state: RootState; rejectValue: PosReject }
>('pos/emailCopy', async (_, { getState, rejectWithValue }) => {
  const { invoice, selectedCustomer, walkIn } = getState().pos;
  if (!invoice || invoice.status !== 'COMPLETED') {
    return rejectWithValue({
      status: 'validation',
      hint: POS_CONTENT.invoiceOutput.empty,
    });
  }
  if (walkIn || !selectedCustomer) {
    return rejectWithValue({
      status: 'validation',
      hint: POS_CONTENT.invoiceOutput.emailRequired,
    });
  }
  if (!selectedCustomer.email?.trim()) {
    return rejectWithValue({
      status: 'validation',
      hint: POS_CONTENT.invoiceOutput.emailRequired,
    });
  }
  try {
    await emailInvoiceCopy(invoice.id);
  } catch (error) {
    return rejectWithValue(toReject(error, POS_CONTENT.invoiceOutput.failure));
  }
});
