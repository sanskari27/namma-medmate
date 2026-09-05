import { isApiError } from '@/services/axios';
import {
  createOffer,
  deactivateOffer,
  listOffers,
  publishOffer,
  updateOffer,
  type SalesOffer,
} from '@/services/offers';
import { listProducts, type Product } from '@/services/products';
import type { RootState } from '@/store';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  apiStatusHint,
  emptyForm,
  formValid,
  hasSalesAccess,
  mapApiStatus,
  toForm,
  toInput,
  type FormState,
  type PageStatus,
} from './OffersScreen.utils';

export function useOffersPage() {
  const user = useSelector((state: RootState) => state.auth.user);
  const statusId = useId();
  const addRef = useRef<HTMLButtonElement | null>(null);
  const allowed = hasSalesAccess(user?.modules);

  const [status, setStatus] = useState<PageStatus>(allowed ? 'loading' : 'denied');
  const [statusHint, setStatusHint] = useState<string | null>(null);
  const [items, setItems] = useState<SalesOffer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [busy, setBusy] = useState(false);

  const selected = items.find((row) => row.id === selectedId) ?? null;

  const load = useCallback(async () => {
    if (!allowed) {
      setStatus('denied');
      return;
    }
    setStatus('loading');
    setStatusHint(null);
    try {
      const [offers, catalogue] = await Promise.all([
        listOffers(),
        listProducts().catch(() => [] as Product[]),
      ]);
      setItems(offers.items);
      setProducts(catalogue);
      setStatus(offers.items.length === 0 ? 'empty' : null);
    } catch (error) {
      setStatus(isApiError(error) ? mapApiStatus(error) : 'failure');
    }
  }, [allowed]);

  useEffect(() => {
    if (!allowed) {
      setStatus('denied');
      return;
    }
    void load();
  }, [allowed, load]);

  function onChange(patch: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function toggleProduct(productId: string) {
    setForm((prev) => ({
      ...prev,
      productIds: prev.productIds.includes(productId)
        ? prev.productIds.filter((id) => id !== productId)
        : [...prev.productIds, productId],
    }));
  }

  function startCreate() {
    setCreating(true);
    setSelectedId(null);
    setForm(emptyForm());
    setStatus(null);
    setStatusHint(null);
  }

  function selectOffer(id: string) {
    const offer = items.find((row) => row.id === id);
    if (!offer) {
      return;
    }
    setCreating(false);
    setSelectedId(id);
    setForm(toForm(offer));
    setStatus(null);
    setStatusHint(null);
  }

  async function onSave() {
    if (!formValid(form)) {
      setStatus('validation');
      setStatusHint(null);
      return;
    }
    setBusy(true);
    try {
      const saved = selected
        ? await updateOffer(selected.id, toInput(form, selected.version))
        : await createOffer(toInput(form));
      setItems((prev) => {
        const rest = prev.filter((row) => row.id !== saved.id);
        return [...rest, saved];
      });
      setCreating(false);
      setSelectedId(saved.id);
      setForm(toForm(saved));
      setStatus('success');
      setStatusHint('Scheme saved as a draft on this counter.');
    } catch (error) {
      const next = isApiError(error) ? mapApiStatus(error) : 'failure';
      setStatus(next);
      setStatusHint(isApiError(error) ? apiStatusHint(error.code) : null);
    } finally {
      setBusy(false);
    }
  }

  async function onPublish() {
    if (!selected) {
      return;
    }
    setBusy(true);
    try {
      const live = await publishOffer(selected.id, { expectedVersion: selected.version });
      setItems((prev) => prev.map((row) => (row.id === live.id ? live : row)));
      setCreating(false);
      setSelectedId(null);
      setForm(emptyForm());
      setStatus('success');
      setStatusHint(`${live.name} is live on this counter.`);
      queueMicrotask(() => addRef.current?.focus());
    } catch (error) {
      const next = isApiError(error) ? mapApiStatus(error) : 'failure';
      setStatus(next);
      setStatusHint(isApiError(error) ? apiStatusHint(error.code) : null);
    } finally {
      setBusy(false);
    }
  }

  async function onDeactivate() {
    if (!selected) {
      return;
    }
    setBusy(true);
    try {
      const off = await deactivateOffer(selected.id, { expectedVersion: selected.version });
      setItems((prev) => prev.map((row) => (row.id === off.id ? off : row)));
      setCreating(false);
      setSelectedId(null);
      setForm(emptyForm());
      setStatus('success');
      setStatusHint('This scheme is off.');
      queueMicrotask(() => addRef.current?.focus());
    } catch (error) {
      const next = isApiError(error) ? mapApiStatus(error) : 'failure';
      setStatus(next);
      setStatusHint(isApiError(error) ? apiStatusHint(error.code) : null);
    } finally {
      setBusy(false);
    }
  }

  return {
    allowed,
    status,
    statusHint,
    statusId,
    addRef,
    items,
    products,
    selected,
    creating,
    form,
    busy,
    startCreate,
    selectOffer,
    onChange,
    toggleProduct,
    onSave: () => void onSave(),
    onPublish: () => void onPublish(),
    onDeactivate: () => void onDeactivate(),
  };
}
