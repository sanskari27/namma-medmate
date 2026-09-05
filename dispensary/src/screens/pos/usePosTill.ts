import { getCustomerCredit } from '@/services/credit';
import { verifyControlledStock } from '@/services/controlledStock';
import { listCustomers, type Customer } from '@/services/customers';
import { listDoctors, type Doctor } from '@/services/doctors';
import { listStockBatches } from '@/services/inventory';
import {
  assertMedicationSafetyCleared,
  evaluateMedicationSafety,
  isApiError,
  type SafetyEvaluation,
} from '@/services/medicationSafety';
import { listProducts, type Product, type ProductUnit } from '@/services/products';
import { convertProductUnit, listProductUnits } from '@/services/productUnits';
import {
  applyInvoicePricing,
  adjustInvoiceTax,
  completeSalesInvoice,
  createSalesInvoice,
  updateSalesInvoice,
  type DiscountType,
  type SalesInvoice,
} from '@/services/salesInvoices';
import type { RootState } from '@/store';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import type { PosDraftLine } from './components/pos-draft-lines';
import {
  canDispenseControlled,
  collectStatusHint,
  emptyTender,
  hasSalesAccess,
  invoiceTotals,
  isControlledProduct,
  mapApiStatus,
  percentToBps,
  previewTender,
  rupeesToPaise,
  type PageStatus,
  type TenderDraft,
} from './PosScreen.utils';

export function usePosTill() {
  const user = useSelector((state: RootState) => state.auth.user);
  const allowed = hasSalesAccess(user?.modules);
  const canDispense = canDispenseControlled(user?.role, user?.roles);
  const idempotencyKey = useRef(crypto.randomUUID());
  const completeKey = useRef(crypto.randomUUID());

  const [status, setStatus] = useState<PageStatus>(allowed ? 'loading' : 'denied');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [catalogue, setCatalogue] = useState<Product[]>([]);
  const [customerQuery, setCustomerQuery] = useState('');
  const [productQuery, setProductQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [walkIn, setWalkIn] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [prescriptionVerified, setPrescriptionVerified] = useState(false);
  const [draft, setDraft] = useState<PosDraftLine[]>([]);
  const [evaluation, setEvaluation] = useState<SafetyEvaluation | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [invoice, setInvoice] = useState<SalesInvoice | null>(null);
  const [billType, setBillType] = useState<DiscountType>('FLAT');
  const [billValue, setBillValue] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [taxProductId, setTaxProductId] = useState<string | null>(null);
  const [taxRate, setTaxRate] = useState('');
  const [taxReason, setTaxReason] = useState('');
  const [tender, setTender] = useState<TenderDraft>(emptyTender);
  const [statusHint, setStatusHint] = useState<string | null>(null);
  const [creditAvailablePaise, setCreditAvailablePaise] = useState<number | null>(null);

  const productIds = draft.map((line) => line.product.id);
  const controlledDraft = draft.some((line) => isControlledProduct(line.product));

  const patchLine = (productId: string, patch: Partial<PosDraftLine>) => {
    setDraft((current) =>
      current.map((line) => (line.product.id === productId ? { ...line, ...patch } : line)),
    );
  };

  const refreshConversion = useCallback(
    async (productId: string, unit: ProductUnit, quantity: string) => {
      const qty = Number(quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        patchLine(productId, { baseQuantity: null });
        return;
      }
      try {
        const converted = await convertProductUnit(productId, { quantity: qty, fromUnit: unit });
        patchLine(productId, { baseQuantity: converted.baseQuantity });
      } catch {
        patchLine(productId, { baseQuantity: null });
      }
    },
    [],
  );

  const loadBootstrap = useCallback(async () => {
    if (!allowed) {
      setStatus('denied');
      return;
    }
    setStatus('loading');
    try {
      const [customerItems, productItems, doctorItems] = await Promise.all([
        listCustomers(),
        listProducts(),
        listDoctors().catch(() => [] as Doctor[]),
      ]);
      setCustomers(customerItems);
      setCatalogue(productItems);
      setDoctors(doctorItems);
      setStatus(productItems.length === 0 ? 'empty' : null);
    } catch (error) {
      setStatus(
        isApiError(error) && (error.status === 403 || error.code === 'FORBIDDEN')
          ? 'denied'
          : 'failure',
      );
    }
  }, [allowed]);

  useEffect(() => {
    void loadBootstrap();
  }, [loadBootstrap]);

  useEffect(() => {
    if (!allowed) {
      return;
    }
    const handle = window.setTimeout(() => {
      void listCustomers(customerQuery.trim() || undefined)
        .then(setCustomers)
        .catch(() => undefined);
    }, 200);
    return () => window.clearTimeout(handle);
  }, [allowed, customerQuery]);

  useEffect(() => {
    if (!allowed) {
      return;
    }
    const handle = window.setTimeout(() => {
      void listProducts(productQuery.trim() || undefined)
        .then(setCatalogue)
        .catch(() => undefined);
    }, 200);
    return () => window.clearTimeout(handle);
  }, [allowed, productQuery]);

  const addProduct = async (product: Product) => {
    if (draft.some((line) => line.product.id === product.id)) {
      return;
    }
    let unitOptions: ProductUnit[] = [product.baseUnit];
    let unit: ProductUnit =
      product.packUnit !== product.baseUnit ? product.packUnit : product.baseUnit;
    try {
      const units = await listProductUnits(product.id);
      unitOptions = [
        units.baseUnit,
        ...units.units.map((row) => row.unit).filter((u) => u !== units.baseUnit),
      ];
      if (!unitOptions.includes(unit)) {
        unit = units.baseUnit;
      }
    } catch {
      unitOptions = [product.baseUnit, product.packUnit].filter(
        (value, index, all) => all.indexOf(value) === index,
      );
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
    setDraft((current) => [
      ...current,
      {
        product,
        unit,
        quantity: '1',
        baseQuantity: null,
        unitOptions,
        batches,
        batchId,
        nearExpiry,
        mrpRupees: '',
        sellingRupees: '',
        discountRupees: '',
        discountType: 'FLAT',
      },
    ]);
    setEvaluation(null);
    void refreshConversion(product.id, unit, '1');
  };

  const linePayload = () => {
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
      });
    }
    return lines.length === 0 ? null : lines;
  };

  const runSave = async () => {
    const lines = linePayload();
    if (!lines) {
      setStatus('validation');
      return;
    }
    if (controlledDraft && (!selectedCustomer || !selectedDoctorId || !prescriptionVerified)) {
      setStatus('validation');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        customerId: selectedCustomer?.id ?? null,
        doctorId: selectedDoctorId || null,
        prescriptionReference: null,
        prescriptionVerified,
        lines,
      };
      const saved = invoice
        ? await updateSalesInvoice(invoice.id, { ...payload, expectedVersion: invoice.version })
        : await createSalesInvoice({ ...payload, idempotencyKey: idempotencyKey.current });
      const pricing = pricingRequest(saved.version);
      if (!pricing) {
        setInvoice(saved);
        setStatus('validation');
        return;
      }
      const priced = await applyInvoicePricing(saved.id, pricing);
      setInvoice(priced);
      setStatus('success');
      setStatusHint(null);
    } catch (error) {
      setStatus(isApiError(error) ? mapApiStatus(error) : 'failure');
    } finally {
      setBusy(false);
    }
  };

  const lineDiscountValue = (line: PosDraftLine): number | null => {
    if (line.discountType === 'PERCENT') {
      return percentToBps(line.discountRupees);
    }
    return rupeesToPaise(line.discountRupees) ?? 0;
  };

  const pricingRequest = (expectedVersion: number) => {
    const billDiscountValue =
      billType === 'PERCENT' ? percentToBps(billValue) : (rupeesToPaise(billValue) ?? 0);
    const lines = draft.map((line) => {
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
      customerGstin: customerGstin.trim() || null,
      billDiscountType: billValue.trim() ? billType : 'NONE',
      billDiscountValue: billValue.trim() ? billDiscountValue : 0,
      lines: lines.map((line) => ({
        productId: line.productId,
        type: line.type,
        value: line.value,
      })),
    };
  };

  const runApplyPricing = async () => {
    if (!invoice) {
      setStatus('validation');
      return;
    }
    const pricing = pricingRequest(invoice.version);
    if (!pricing) {
      setStatus('validation');
      return;
    }
    setBusy(true);
    try {
      const saved = await applyInvoicePricing(invoice.id, pricing);
      setInvoice(saved);
      setStatus('success');
    } catch (error) {
      setStatus(isApiError(error) ? mapApiStatus(error) : 'failure');
    } finally {
      setBusy(false);
    }
  };

  const runTaxAdjust = async () => {
    if (!invoice || !taxProductId) {
      setStatus('validation');
      return;
    }
    if (!taxReason.trim()) {
      setStatus('validation');
      return;
    }
    const rate = Number(taxRate);
    if (!Number.isFinite(rate) || rate < 0) {
      setStatus('validation');
      return;
    }
    setBusy(true);
    try {
      const saved = await adjustInvoiceTax(invoice.id, {
        expectedVersion: invoice.version,
        reason: taxReason.trim(),
        lines: [{ productId: taxProductId, gstRate: rate }],
      });
      setInvoice(saved);
      setTaxProductId(null);
      setTaxReason('');
      setStatus('success');
      window.setTimeout(() => document.getElementById('pos-product-search')?.focus(), 0);
    } catch (error) {
      setStatus(isApiError(error) ? mapApiStatus(error) : 'failure');
    } finally {
      setBusy(false);
    }
  };

  const runEvaluate = async () => {
    if (!selectedCustomer || draft.length === 0) {
      setStatus('validation');
      return;
    }
    setBusy(true);
    setStatus('loading');
    try {
      const result = await evaluateMedicationSafety(selectedCustomer.id, productIds);
      setEvaluation(result);
      setStatus(null);
    } catch (error) {
      setStatus(isApiError(error) ? mapApiStatus(error) : 'failure');
    } finally {
      setBusy(false);
    }
  };

  const runComplete = async () => {
    if (!selectedCustomer || draft.length === 0) {
      setStatus('validation');
      return;
    }
    if (controlledDraft) {
      if (!canDispense) {
        setStatus('denied');
        return;
      }
      if (!selectedDoctorId || !prescriptionVerified) {
        setStatus('validation');
        return;
      }
    }
    const warnings = evaluation?.warnings ?? [];
    if (warnings.length > 0 && !reason.trim()) {
      setStatus('validation');
      return;
    }
    setBusy(true);
    try {
      if (controlledDraft && selectedCustomer && selectedDoctorId) {
        await verifyControlledStock({
          customerId: selectedCustomer.id,
          doctorId: selectedDoctorId,
          prescriptionVerified,
          productIds,
        });
      }
      if (!evaluation) {
        const fresh = await evaluateMedicationSafety(selectedCustomer.id, productIds);
        setEvaluation(fresh);
        if (fresh.warnings.length > 0 && !reason.trim()) {
          setStatus('validation');
          setBusy(false);
          return;
        }
        await assertMedicationSafetyCleared({
          customerId: selectedCustomer.id,
          productIds,
          warningKeys: fresh.warnings.map((item) => item.warningKey),
          reason: fresh.warnings.length > 0 ? reason.trim() : null,
        });
      } else {
        await assertMedicationSafetyCleared({
          customerId: selectedCustomer.id,
          productIds,
          warningKeys: warnings.map((item) => item.warningKey),
          reason: warnings.length > 0 ? reason.trim() : null,
        });
      }
      setStatus('success');
      setReason('');
    } catch (error) {
      setStatus(isApiError(error) ? mapApiStatus(error) : 'failure');
    } finally {
      setBusy(false);
    }
  };

  const runCollect = async () => {
    if (!invoice || invoice.status === 'COMPLETED') {
      setStatus('validation');
      setStatusHint(collectStatusHint('validation'));
      return;
    }
    const preview = previewTender(invoice.totalPaise, tender);
    if (preview.invalid || preview.parts.length === 0) {
      setStatus('validation');
      setStatusHint(collectStatusHint('validation'));
      return;
    }
    if (preview.remainingPaise > 0) {
      setStatus('validation');
      setStatusHint(collectStatusHint('validation'));
      return;
    }
    const cashPaise = preview.parts.find((part) => part.mode === 'CASH')?.amountPaise ?? 0;
    if (preview.changePaise > cashPaise) {
      setStatus('validation');
      setStatusHint(collectStatusHint('validation'));
      return;
    }
    if (tender.creditRupees.trim() && (walkIn || !selectedCustomer)) {
      setStatus('validation');
      setStatusHint(collectStatusHint('validation', 'KHATA_REQUIRES_CUSTOMER'));
      return;
    }
    setBusy(true);
    try {
      const collected = await completeSalesInvoice(invoice.id, {
        expectedVersion: invoice.version,
        expectedTotalPaise: invoice.totalPaise,
        changePaise: preview.changePaise,
        idempotencyKey: completeKey.current,
        payments: preview.parts,
      });
      setInvoice(collected);
      setStatus('success');
      setStatusHint(`Bill ${collected.invoiceNumber} collected at this till.`);
      window.setTimeout(() => document.getElementById('pos-product-search')?.focus(), 0);
    } catch (error) {
      const next = isApiError(error) ? mapApiStatus(error) : 'failure';
      setStatus(next);
      setStatusHint(
        collectStatusHint(next, isApiError(error) ? error.code : null) ??
          (next === 'failure' ? collectStatusHint('failure') : null),
      );
    } finally {
      setBusy(false);
    }
  };

  const totals = invoiceTotals(
    invoice,
    draft.map((line) => ({
      quantity: line.quantity,
      mrpRupees: line.mrpRupees,
      sellingRupees: line.sellingRupees,
      discountRupees: line.discountRupees,
      gstRate: line.product.gstRate,
    })),
  );

  return {
    allowed,
    canDispense,
    status,
    customers,
    doctors,
    catalogue,
    customerQuery,
    setCustomerQuery,
    productQuery,
    setProductQuery,
    selectedCustomer,
    walkIn,
    selectedDoctorId,
    setSelectedDoctorId,
    prescriptionVerified,
    setPrescriptionVerified,
    draft,
    evaluation,
    reason,
    setReason,
    busy,
    invoice,
    controlledDraft,
    totals,
    billType,
    billValue,
    customerGstin,
    taxProductId,
    taxRate,
    taxReason,
    taxProductName:
      draft.find((line) => line.product.id === taxProductId)?.product.name ?? 'this medicine',
    showReason: Boolean(evaluation && evaluation.warnings.length > 0),
    statusHint,
    tender,
    tenderPreview: previewTender(invoice?.totalPaise ?? totals.totalPaise, tender),
    creditAvailablePaise,
    collected: invoice?.status === 'COMPLETED',
    setTender: (patch: Partial<TenderDraft>) => {
      setTender((current) => ({ ...current, ...patch }));
    },
    selectCustomer: (customer: Customer) => {
      setSelectedCustomer(customer);
      setWalkIn(false);
      setEvaluation(null);
      setStatus(null);
      setStatusHint(null);
      void getCustomerCredit(customer.id)
        .then((credit) => setCreditAvailablePaise(credit.availablePaise))
        .catch(() => setCreditAvailablePaise(null));
    },
    clearCustomer: () => {
      setSelectedCustomer(null);
      setWalkIn(false);
      setEvaluation(null);
      setCreditAvailablePaise(null);
    },
    skipWalkIn: () => {
      setSelectedCustomer(null);
      setWalkIn(true);
      setEvaluation(null);
      setCreditAvailablePaise(null);
      setTender((current) => ({ ...current, creditRupees: '' }));
      setStatus(null);
      window.setTimeout(() => document.getElementById('pos-product-search')?.focus(), 0);
    },
    addProduct: (product: Product) => void addProduct(product),
    removeProduct: (productId: string) => {
      setDraft((current) => current.filter((item) => item.product.id !== productId));
      setEvaluation(null);
    },
    changeUnit: (productId: string, unit: ProductUnit) => {
      patchLine(productId, { unit });
      const line = draft.find((item) => item.product.id === productId);
      void refreshConversion(productId, unit, line?.quantity ?? '1');
      setEvaluation(null);
    },
    changeQuantity: (productId: string, quantity: string) => {
      patchLine(productId, { quantity });
      const line = draft.find((item) => item.product.id === productId);
      void refreshConversion(productId, line?.unit ?? 'Tablet', quantity);
    },
    changeBatch: (productId: string, batchId: string) => {
      setDraft((current) =>
        current.map((line) => {
          if (line.product.id !== productId) {
            return line;
          }
          const batch = line.batches.find((item) => item.batchId === batchId);
          return { ...line, batchId, nearExpiry: batch?.nearExpiry === true };
        }),
      );
    },
    changeMrp: (productId: string, value: string) => patchLine(productId, { mrpRupees: value }),
    changeSelling: (productId: string, value: string) =>
      patchLine(productId, { sellingRupees: value }),
    changeDiscount: (productId: string, value: string) =>
      patchLine(productId, { discountRupees: value }),
    changeDiscountType: (productId: string, value: DiscountType) =>
      patchLine(productId, { discountType: value, discountRupees: '' }),
    setBillType,
    setBillValue,
    setCustomerGstin,
    setTaxRate,
    setTaxReason,
    openTaxOverride: (productId: string) => {
      const line = draft.find((item) => item.product.id === productId);
      setTaxProductId(productId);
      setTaxRate(
        String(
          line?.product.gstRate ??
            invoice?.lines.find((row) => row.productId === productId)?.gstRate ??
            '',
        ),
      );
      setTaxReason('');
    },
    closeTaxOverride: () => {
      setTaxProductId(null);
      window.setTimeout(() => document.getElementById('pos-product-search')?.focus(), 0);
    },
    runSave: () => void runSave(),
    runApplyPricing: () => void runApplyPricing(),
    runTaxAdjust: () => void runTaxAdjust(),
    runEvaluate: () => void runEvaluate(),
    runComplete: () => void runComplete(),
    runCollect: () => void runCollect(),
  };
}
