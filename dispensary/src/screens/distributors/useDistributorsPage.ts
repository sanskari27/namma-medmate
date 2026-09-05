import { listProductCategories, type ProductCategory } from '@/services/productCategories';
import { getCurrentSubscription } from '@/services/subscriptions';
import {
  createSupplier,
  getSupplierLedger,
  isApiError,
  listSupplierDues,
  listSuppliers,
  recordSupplierPayment,
  updateSupplier,
  type Supplier,
  type SupplierDueItem,
  type SupplierLedger,
} from '@/services/suppliers';
import type { RootState } from '@/store';
import { FormEvent, useCallback, useEffect, useId, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  canSeeSupplierDues,
  emptyForm,
  hasSupplierAccess,
  mapApiStatus,
  toForm,
  toInput,
  validateForm,
  type BannerSurface,
  type FormState,
  type PageStatus,
} from './DistributorsScreen.utils';

export function useDistributorsPage() {
  const user = useSelector((state: RootState) => state.auth.user);
  const formId = useId();
  const statusId = useId();
  const addRef = useRef<HTMLButtonElement | null>(null);
  const payRef = useRef<HTMLButtonElement | null>(null);
  const allowed = hasSupplierAccess(user?.modules);
  const outletName =
    user?.branches?.find((branch) => branch.id === user.activeBranchId)?.name ?? null;

  const [status, setStatus] = useState<PageStatus>('loading');
  const [surface, setSurface] = useState<BannerSurface>('book');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [dues, setDues] = useState<SupplierDueItem[] | null>(null);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [ledger, setLedger] = useState<SupplierLedger | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [payBusy, setPayBusy] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const selected = suppliers.find((row) => row.id === selectedId) ?? null;

  const loadLedger = useCallback(async (supplierId: string, keepStatus = false) => {
    setLedgerLoading(true);
    if (!keepStatus) {
      setSurface('khata');
      setStatus(null);
    }
    try {
      const next = await getSupplierLedger(supplierId);
      setLedger(next);
    } catch (error) {
      setLedger(null);
      if (!keepStatus) {
        setSurface('khata');
        setStatus(isApiError(error) ? mapApiStatus(error) : 'failure');
      }
    } finally {
      setLedgerLoading(false);
    }
  }, []);

  const load = useCallback(
    async (search?: string) => {
      if (!allowed) {
        setStatus('denied');
        return;
      }
      setSurface('book');
      setStatus('loading');
      try {
        const [items, cats, subscription] = await Promise.all([
          listSuppliers(search),
          listProductCategories().catch(() => [] as ProductCategory[]),
          getCurrentSubscription().catch(() => null),
        ]);
        setSuppliers(items);
        setCategories(cats);
        if (canSeeSupplierDues(subscription?.planCode)) {
          try {
            setDues(await listSupplierDues());
          } catch {
            setDues([]);
          }
        } else {
          setDues(null);
        }
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
    setLedger(null);
    setSurface('book');
    setStatus(null);
  }

  function cancelEdit() {
    setCreating(false);
    setSelectedId(null);
    setForm(emptyForm);
    setLedger(null);
    setSurface('book');
    setStatus(null);
    queueMicrotask(() => addRef.current?.focus());
  }

  function selectSupplier(supplier: Supplier) {
    setCreating(false);
    setSelectedId(supplier.id);
    setForm(toForm(supplier));
    void loadLedger(supplier.id);
  }

  async function onSearch(event: FormEvent) {
    event.preventDefault();
    await load(query);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validateForm(form)) {
      setSurface('book');
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
      setSurface('book');
      setStatus('success');
      void loadLedger(saved.id, true);
    } catch (error) {
      setSurface('book');
      if (isApiError(error)) {
        setStatus(mapApiStatus(error));
      } else {
        setStatus('failure');
      }
    } finally {
      setBusy(false);
    }
  }

  async function onPay(input: { amountRupees: string; mode: string; reference: string }) {
    if (!selected || !ledger) {
      return;
    }
    const rupees = Number(input.amountRupees);
    if (!Number.isFinite(rupees) || rupees <= 0 || !input.mode.trim() || !input.reference.trim()) {
      setSurface('khata');
      setStatus('validation');
      setPayError('Enter amount, mode, and a payment reference. Overpayment is not booked.');
      return;
    }
    setPayBusy(true);
    setPayError(null);
    try {
      const next = await recordSupplierPayment(selected.id, {
        amountPaise: Math.round(rupees * 100),
        mode: input.mode,
        reference: input.reference.trim(),
        idempotencyKey: crypto.randomUUID(),
        expectedAccountVersion: ledger.version,
      });
      setLedger(next);
      setPayOpen(false);
      setSurface('khata');
      setStatus('success');
      if (dues) {
        try {
          setDues(await listSupplierDues());
        } catch {
          /* keep last dues */
        }
      }
    } catch (error) {
      setSurface('khata');
      const nextStatus = isApiError(error) ? mapApiStatus(error) : 'failure';
      setStatus(nextStatus);
      if (nextStatus === 'conflict') {
        setPayError(
          'This payment reference is already on the khata, or the balance changed. Refresh and try again.',
        );
      } else if (nextStatus === 'validation') {
        setPayError('Enter amount, mode, and a payment reference. Overpayment is not booked.');
      } else if (nextStatus === 'denied') {
        setPayError(
          'This till cannot open the stockist khata. Ask the owner for Purchases or Accounts.',
        );
      } else {
        setPayError('Could not reach the server for the stockist khata. Try again.');
      }
    } finally {
      setPayBusy(false);
    }
  }

  return {
    formId,
    statusId,
    addRef,
    payRef,
    allowed,
    outletName,
    status,
    surface,
    suppliers,
    categories,
    dues,
    query,
    setQuery,
    creating,
    form,
    busy,
    ledger,
    ledgerLoading,
    payOpen,
    setPayOpen,
    payBusy,
    payError,
    setPayError,
    selected,
    onChange,
    startCreate,
    cancelEdit,
    selectSupplier,
    onSearch,
    onSubmit,
    onPay,
  };
}
