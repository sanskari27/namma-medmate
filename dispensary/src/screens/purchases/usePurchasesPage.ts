import { listProducts, type Product } from '@/services/products';
import {
  bulkPurchaseOrders,
  cancelPurchaseOrder,
  closePurchaseOrder,
  createPurchaseOrder,
  getPurchaseOrderAnalytics,
  isApiError,
  issuePurchaseOrder,
  listPurchaseOrderVersions,
  listPurchaseOrders,
  updatePurchaseOrder,
  type PurchaseOrder,
  type PurchaseOrderAnalytics,
  type PurchaseOrderVersion,
  type ReorderDraftResult,
} from '@/services/purchaseOrders';
import { getCurrentSubscription } from '@/services/subscriptions';
import { listSuppliers, type Supplier } from '@/services/suppliers';
import type { RootState } from '@/store';
import { FormEvent, useCallback, useEffect, useId, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  emptyForm,
  hasPurchaseAccess,
  isProPlan,
  mapApiStatus,
  toForm,
  toLineInputs,
  validateForm,
  type FormState,
  type PageStatus,
} from './PurchasesScreen.utils';

export function usePurchasesPage() {
  const user = useSelector((state: RootState) => state.auth.user);
  const formId = useId();
  const statusId = useId();
  const addRef = useRef<HTMLButtonElement | null>(null);
  const reorderRef = useRef<HTMLButtonElement | null>(null);
  const allowed = hasPurchaseAccess(user?.modules);

  const [status, setStatus] = useState<PageStatus>('loading');
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [versions, setVersions] = useState<PurchaseOrderVersion[]>([]);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [leftVersion, setLeftVersion] = useState<number | null>(null);
  const [rightVersion, setRightVersion] = useState<number | null>(null);
  const [planCode, setPlanCode] = useState<string | null>(null);
  const [reorderOpen, setReorderOpen] = useState(false);
  const [analytics, setAnalytics] = useState<PurchaseOrderAnalytics | null>(null);
  const [spendStatus, setSpendStatus] = useState<'loading' | 'empty' | 'denied' | 'failure' | null>(
    null,
  );

  const selected = orders.find((row) => row.id === selectedId) ?? null;

  const load = useCallback(async () => {
    if (!allowed) {
      setStatus('denied');
      return;
    }
    setStatus('loading');
    try {
      const [items, stockists, packs, subscription] = await Promise.all([
        listPurchaseOrders(),
        listSuppliers().catch(() => [] as Supplier[]),
        listProducts().catch(() => [] as Product[]),
        getCurrentSubscription().catch(() => null),
      ]);
      setOrders(items);
      setSuppliers(stockists.filter((row) => row.status === 'ACTIVE'));
      setProducts(packs.filter((row) => row.isActive && !row.isDiscontinued));
      setPlanCode(subscription?.planCode ?? null);
      setStatus(items.length === 0 ? 'empty' : null);
      if (subscription && isProPlan(subscription.planCode)) {
        setSpendStatus('loading');
        try {
          const spend = await getPurchaseOrderAnalytics();
          setAnalytics(spend);
          setSpendStatus(spend.suppliers.length === 0 ? 'empty' : null);
        } catch (error) {
          setSpendStatus(isApiError(error) && error.code === 'PLAN_LIMIT' ? 'denied' : 'failure');
        }
      } else {
        setAnalytics(null);
        setSpendStatus(null);
      }
    } catch (error) {
      setStatus(isApiError(error) ? mapApiStatus(error) : 'failure');
    }
  }, [allowed]);

  useEffect(() => {
    void load();
  }, [load]);

  function onChange<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function startCreate() {
    setCreating(true);
    setSelectedId(null);
    setForm(emptyForm);
    setVersions([]);
    setLeftVersion(null);
    setRightVersion(null);
    setStatus(null);
  }

  function cancelEdit() {
    setCreating(false);
    setSelectedId(null);
    setForm(emptyForm);
    setVersions([]);
    setStatus(null);
    queueMicrotask(() => addRef.current?.focus());
  }

  async function selectOrder(order: PurchaseOrder) {
    setCreating(false);
    setSelectedId(order.id);
    setForm(toForm(order));
    setStatus(null);
    try {
      const history = await listPurchaseOrderVersions(order.id);
      setVersions(history);
      setLeftVersion(history[0]?.version ?? null);
      setRightVersion(history[history.length - 1]?.version ?? null);
    } catch {
      setVersions([]);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validateForm(form)) {
      setStatus('validation');
      return;
    }
    setBusy(true);
    try {
      const lines = toLineInputs(form);
      const saved = creating
        ? await createPurchaseOrder({
            supplierId: form.supplierId,
            expectedDeliveryDate: form.expectedDeliveryDate || null,
            paymentTerms: form.paymentTerms,
            notes: form.notes || undefined,
            idempotencyKey: crypto.randomUUID(),
            lines,
          })
        : selected
          ? await updatePurchaseOrder(selected.id, {
              expectedVersion: selected.version,
              expectedDeliveryDate: form.expectedDeliveryDate || null,
              paymentTerms: form.paymentTerms,
              notes: form.notes || undefined,
              lines,
            })
          : null;
      if (!saved) {
        setBusy(false);
        return;
      }
      setOrders((prev) => [saved, ...prev.filter((row) => row.id !== saved.id)]);
      setCreating(false);
      setSelectedId(saved.id);
      setForm(toForm(saved));
      const history = await listPurchaseOrderVersions(saved.id).catch(
        () => [] as PurchaseOrderVersion[],
      );
      setVersions(history);
      setLeftVersion(history[0]?.version ?? null);
      setRightVersion(history[history.length - 1]?.version ?? null);
      setStatus('success');
    } catch (error) {
      setStatus(isApiError(error) ? mapApiStatus(error) : 'failure');
    } finally {
      setBusy(false);
    }
  }

  async function runTransition(action: (id: string, version: number) => Promise<PurchaseOrder>) {
    if (!selected) {
      return;
    }
    setBusy(true);
    try {
      const saved = await action(selected.id, selected.version);
      setOrders((prev) => prev.map((row) => (row.id === saved.id ? saved : row)));
      setSelectedId(saved.id);
      setForm(toForm(saved));
      const history = await listPurchaseOrderVersions(saved.id).catch(
        () => [] as PurchaseOrderVersion[],
      );
      setVersions(history);
      setStatus('success');
    } catch (error) {
      setStatus(isApiError(error) ? mapApiStatus(error) : 'failure');
    } finally {
      setBusy(false);
    }
  }

  function onReorderCreated(result: ReorderDraftResult) {
    const drafts = result.drafts.filter((row) => row.id);
    setOrders((prev) => [...drafts, ...prev.filter((row) => !drafts.some((d) => d.id === row.id))]);
    setStatus('success');
  }

  async function onBulkIssue(items: Array<{ id: string; expectedVersion: number }>) {
    if (items.length === 0) {
      setStatus('validation');
      return;
    }
    setBusy(true);
    try {
      const updated = await bulkPurchaseOrders('ISSUE', items);
      setOrders((prev) => prev.map((row) => updated.find((item) => item.id === row.id) ?? row));
      setStatus('success');
      if (isProPlan(planCode)) {
        const spend = await getPurchaseOrderAnalytics().catch(() => null);
        if (spend) {
          setAnalytics(spend);
          setSpendStatus(spend.suppliers.length === 0 ? 'empty' : null);
        }
      }
    } catch (error) {
      setStatus(isApiError(error) ? mapApiStatus(error) : 'failure');
    } finally {
      setBusy(false);
    }
  }

  return {
    formId,
    statusId,
    addRef,
    reorderRef,
    allowed,
    status,
    setStatus,
    orders,
    suppliers,
    products,
    versions,
    query,
    setQuery,
    selected,
    creating,
    form,
    busy,
    leftVersion,
    rightVersion,
    setLeftVersion,
    setRightVersion,
    planCode,
    reorderOpen,
    setReorderOpen,
    analytics,
    spendStatus,
    onChange,
    startCreate,
    cancelEdit,
    selectOrder,
    onSubmit,
    runTransition,
    onReorderCreated,
    onBulkIssue,
    issuePurchaseOrder,
    closePurchaseOrder,
    cancelPurchaseOrder,
  };
}
