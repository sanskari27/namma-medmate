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
  createSalesInvoice,
  updateSalesInvoice,
  type SalesInvoice,
} from '@/services/salesInvoices';
import type { RootState } from '@/store';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import type { PosDraftLine } from './components/pos-draft-lines';
import {
  canDispenseControlled,
  hasSalesAccess,
  invoiceTotals,
  isControlledProduct,
  mapApiStatus,
  rupeesToPaise,
  type PageStatus,
} from './PosScreen.utils';

export function usePosTill() {
  const user = useSelector((state: RootState) => state.auth.user);
  const allowed = hasSalesAccess(user?.modules);
  const canDispense = canDispenseControlled(user?.role, user?.roles);
  const idempotencyKey = useRef(crypto.randomUUID());

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
      setInvoice(saved);
      setStatus('success');
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
    showReason: Boolean(evaluation && evaluation.warnings.length > 0),
    selectCustomer: (customer: Customer) => {
      setSelectedCustomer(customer);
      setWalkIn(false);
      setEvaluation(null);
      setStatus(null);
    },
    clearCustomer: () => {
      setSelectedCustomer(null);
      setWalkIn(false);
      setEvaluation(null);
    },
    skipWalkIn: () => {
      setSelectedCustomer(null);
      setWalkIn(true);
      setEvaluation(null);
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
    runSave: () => void runSave(),
    runEvaluate: () => void runEvaluate(),
    runComplete: () => void runComplete(),
  };
}
