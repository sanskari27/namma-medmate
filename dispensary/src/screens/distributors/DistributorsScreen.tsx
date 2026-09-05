import { listProductCategories, type ProductCategory } from '@/services/productCategories';
import {
  createSupplier,
  isApiError,
  listSuppliers,
  updateSupplier,
  type Supplier,
} from '@/services/suppliers';
import type { RootState } from '@/store';
import { FormEvent, useCallback, useEffect, useId, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { DistributorFormPanel } from './components/distributor-form-panel';
import { DistributorListPanel } from './components/distributor-list-panel';
import { DistributorsHeader } from './components/distributors-header';
import { DistributorsStatusBanner } from './components/distributors-status-banner';
import {
  emptyForm,
  hasSupplierAccess,
  mapApiStatus,
  toForm,
  toInput,
  validateForm,
  type FormState,
  type PageStatus,
} from './DistributorsScreen.utils';

export default function DistributorsScreen() {
  const user = useSelector((state: RootState) => state.auth.user);
  const formId = useId();
  const statusId = useId();
  const addRef = useRef<HTMLButtonElement | null>(null);
  const allowed = hasSupplierAccess(user?.modules);
  const outletName =
    user?.branches?.find((branch) => branch.id === user.activeBranchId)?.name ?? null;

  const [status, setStatus] = useState<PageStatus>('loading');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [busy, setBusy] = useState(false);

  const selected = suppliers.find((row) => row.id === selectedId) ?? null;

  const load = useCallback(
    async (search?: string) => {
      if (!allowed) {
        setStatus('denied');
        return;
      }
      setStatus('loading');
      try {
        const [items, cats] = await Promise.all([
          listSuppliers(search),
          listProductCategories().catch(() => [] as ProductCategory[]),
        ]);
        setSuppliers(items);
        setCategories(cats);
        setStatus(items.length === 0 ? 'empty' : null);
      } catch (error) {
        if (isApiError(error)) {
          setStatus(mapApiStatus(error));
        } else {
          setStatus('failure');
        }
      }
    },
    [allowed],
  );

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
    setStatus(null);
  }

  function cancelEdit() {
    setCreating(false);
    setSelectedId(null);
    setForm(emptyForm);
    setStatus(null);
    queueMicrotask(() => addRef.current?.focus());
  }

  function selectSupplier(supplier: Supplier) {
    setCreating(false);
    setSelectedId(supplier.id);
    setForm(toForm(supplier));
    setStatus(null);
  }

  async function onSearch(event: FormEvent) {
    event.preventDefault();
    await load(query);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validateForm(form)) {
      setStatus('validation');
      return;
    }
    setBusy(true);
    try {
      const input = toInput(form);
      const saved = creating
        ? await createSupplier(input)
        : selected
          ? await updateSupplier(selected.id, input)
          : null;
      if (!saved) {
        setBusy(false);
        return;
      }
      setSuppliers((prev) => {
        const without = prev.filter((row) => row.id !== saved.id);
        return [saved, ...without];
      });
      setCreating(false);
      setSelectedId(saved.id);
      setForm(toForm(saved));
      setStatus('success');
    } catch (error) {
      if (isApiError(error)) {
        setStatus(mapApiStatus(error));
      } else {
        setStatus('failure');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <DistributorsHeader
        addButtonId={`${formId}-add`}
        addButtonRef={addRef}
        denied={!allowed}
        onAdd={startCreate}
      />
      <DistributorsStatusBanner status={status} statusId={statusId} asAlert={status === 'denied'} />
      {allowed ? (
        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(16rem,20rem)_1fr]">
          <DistributorListPanel
            formId={formId}
            suppliers={suppliers}
            selectedId={creating ? null : selectedId}
            query={query}
            showEmptyHint={suppliers.length === 0 && status !== 'loading'}
            onQueryChange={setQuery}
            onSearch={onSearch}
            onSelect={selectSupplier}
          />
          <DistributorFormPanel
            formId={formId}
            form={form}
            selected={creating ? null : selected}
            creating={creating}
            busy={busy}
            categories={categories}
            outletName={outletName}
            onChange={onChange}
            onCancel={cancelEdit}
            onSubmit={onSubmit}
          />
        </div>
      ) : null}
    </div>
  );
}
