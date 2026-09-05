import { listProducts, type Product } from '@/services/products';
import {
  cancelPurchaseOrder,
  closePurchaseOrder,
  createPurchaseOrder,
  isApiError,
  issuePurchaseOrder,
  listPurchaseOrderVersions,
  listPurchaseOrders,
  updatePurchaseOrder,
  type PurchaseOrder,
  type PurchaseOrderVersion,
} from '@/services/purchaseOrders';
import { listSuppliers, type Supplier } from '@/services/suppliers';
import type { RootState } from '@/store';
import { FormEvent, useCallback, useEffect, useId, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { PurchaseOrderListPanel } from './components/purchase-order-list-panel';
import { PurchaseOrderPanel } from './components/purchase-order-panel';
import { PurchasesHeader } from './components/purchases-header';
import { PurchasesStatusBanner } from './components/purchases-status-banner';
import {
  emptyForm,
  hasPurchaseAccess,
  mapApiStatus,
  toForm,
  toLineInputs,
  validateForm,
  type FormState,
  type PageStatus,
} from './PurchasesScreen.utils';

export default function PurchasesScreen() {
  const user = useSelector((state: RootState) => state.auth.user);
  const formId = useId();
  const statusId = useId();
  const addRef = useRef<HTMLButtonElement | null>(null);
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

  const selected = orders.find((row) => row.id === selectedId) ?? null;

  const load = useCallback(async () => {
    if (!allowed) {
      setStatus('denied');
      return;
    }
    setStatus('loading');
    try {
      const [items, stockists, packs] = await Promise.all([
        listPurchaseOrders(),
        listSuppliers().catch(() => [] as Supplier[]),
        listProducts().catch(() => [] as Product[]),
      ]);
      setOrders(items);
      setSuppliers(stockists.filter((row) => row.status === 'ACTIVE'));
      setProducts(packs.filter((row) => row.isActive && !row.isDiscontinued));
      setStatus(items.length === 0 ? 'empty' : null);
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

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PurchasesHeader
        addButtonId={`${formId}-add`}
        addButtonRef={addRef}
        denied={!allowed}
        onAdd={startCreate}
      />
      <PurchasesStatusBanner status={status} statusId={statusId} asAlert={status === 'denied'} />
      {allowed ? (
        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(16rem,20rem)_1fr]">
          <PurchaseOrderListPanel
            formId={formId}
            orders={orders}
            selectedId={creating ? null : selectedId}
            query={query}
            showEmptyHint={orders.length === 0 && status !== 'loading'}
            onQueryChange={setQuery}
            onSelect={(order) => {
              void selectOrder(order);
            }}
          />
          <PurchaseOrderPanel
            formId={formId}
            form={form}
            selected={creating ? null : selected}
            creating={creating}
            busy={busy}
            suppliers={suppliers}
            products={products}
            versions={versions}
            leftVersion={leftVersion}
            rightVersion={rightVersion}
            onChange={onChange}
            onLinesChange={(lines) => onChange('lines', lines)}
            onLeftVersion={setLeftVersion}
            onRightVersion={setRightVersion}
            onCancel={cancelEdit}
            onSubmit={onSubmit}
            onIssue={() => {
              void runTransition(issuePurchaseOrder);
            }}
            onClose={() => {
              void runTransition(closePurchaseOrder);
            }}
            onCancelOrder={() => {
              void runTransition(cancelPurchaseOrder);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
