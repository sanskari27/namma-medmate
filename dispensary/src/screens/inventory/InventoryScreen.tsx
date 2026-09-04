import {
  createManufacturer,
  isApiError,
  listManufacturers,
  type Manufacturer,
} from '@/services/manufacturers';
import {
  createProductCategory,
  listProductCategories,
  type ProductCategory,
} from '@/services/productCategories';
import { createProduct, listProducts, updateProduct, type Product } from '@/services/products';
import { listProductUnits, replaceProductUnits } from '@/services/productUnits';
import type { RootState } from '@/store';
import { FormEvent, useCallback, useEffect, useId, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { InventoryFormPanel } from './components/inventory-form-panel';
import { InventoryHeader } from './components/inventory-header';
import { InventoryListPanel } from './components/inventory-list-panel';
import { InventoryStatusBanner } from './components/inventory-status-banner';
import {
  applyUnitsToForm,
  emptyForm,
  hasInventoryAccess,
  mapApiStatus,
  toForm,
  toInput,
  validateForm,
  type FormState,
  type PageStatus,
  type UnitRow,
} from './InventoryScreen.utils';

export default function InventoryScreen() {
  const user = useSelector((state: RootState) => state.auth.user);
  const allowed = hasInventoryAccess(user?.modules);
  const formId = useId();
  const statusId = useId();
  const addRef = useRef<HTMLButtonElement | null>(null);

  const [status, setStatus] = useState<PageStatus>(allowed ? 'loading' : 'denied');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<'idle' | 'create' | 'edit'>('idle');
  const [form, setForm] = useState<FormState>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newManufacturerName, setNewManufacturerName] = useState('');
  const [categoryBusy, setCategoryBusy] = useState(false);
  const [manufacturerBusy, setManufacturerBusy] = useState(false);

  const load = useCallback(
    async (search?: string) => {
      if (!allowed) {
        setStatus('denied');
        return;
      }
      setStatus('loading');
      try {
        const [items, cats, mfrs] = await Promise.all([
          listProducts(search),
          listProductCategories(),
          listManufacturers(),
        ]);
        setProducts(items);
        setCategories(cats);
        setManufacturers(mfrs);
        setStatus(items.length === 0 ? 'empty' : null);
      } catch (error) {
        setStatus(
          isApiError(error) && (error.status === 403 || error.code === 'FORBIDDEN')
            ? 'denied'
            : 'failure',
        );
      }
    },
    [allowed],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const onChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const startCreate = () => {
    setSelectedId(null);
    setForm(emptyForm);
    setMode('create');
    setStatus(products.length === 0 ? 'empty' : null);
  };

  const selectProduct = async (product: Product) => {
    setSelectedId(product.id);
    setForm(toForm(product));
    setMode('edit');
    setStatus('loading');
    try {
      const units = await listProductUnits(product.id);
      setForm(applyUnitsToForm(toForm(product), units));
      setStatus(null);
    } catch (error) {
      setStatus(mapApiStatus(error));
    }
  };

  const cancelForm = () => {
    setMode('idle');
    setSelectedId(null);
    setForm(emptyForm);
    addRef.current?.focus();
  };

  const onUnitRowsChange = (rows: UnitRow[]) => {
    setForm((prev) => ({ ...prev, unitRows: rows }));
  };

  const onSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!validateForm(form)) {
      setStatus('validation');
      return;
    }
    setBusy(true);
    try {
      const input = toInput(form);
      const saved =
        mode === 'edit' && selectedId
          ? await updateProduct(selectedId, input)
          : await createProduct(input);
      const units = await replaceProductUnits(saved.id, {
        quantityPrecision: Number(form.quantityPrecision),
        units: form.unitRows.map((row) => ({
          unit: row.unit,
          factorToBase: Number(row.factorToBase),
        })),
      });
      await load(query.trim() || undefined);
      setSelectedId(saved.id);
      setForm(applyUnitsToForm(toForm(saved), units));
      setMode('edit');
      setStatus('success');
    } catch (error) {
      setStatus(mapApiStatus(error));
    } finally {
      setBusy(false);
    }
  };

  const onCreateCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    setCategoryBusy(true);
    try {
      const created = await createProductCategory(name);
      setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      onChange('categoryId', created.id);
      setNewCategoryName('');
    } catch {
      setStatus('failure');
    } finally {
      setCategoryBusy(false);
    }
  };

  const onCreateManufacturer = async () => {
    const name = newManufacturerName.trim();
    if (!name) return;
    setManufacturerBusy(true);
    try {
      const created = await createManufacturer(name);
      setManufacturers((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      onChange('manufacturerId', created.id);
      setNewManufacturerName('');
    } catch {
      setStatus('failure');
    } finally {
      setManufacturerBusy(false);
    }
  };

  const denied = !allowed || status === 'denied';
  const showBanner = status !== null;

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 bg-canvas">
      <InventoryHeader addButtonRef={addRef} denied={denied} onAdd={startCreate} />
      {showBanner ? (
        <InventoryStatusBanner status={status} statusId={statusId} asAlert={status === 'denied'} />
      ) : (
        <div className="min-h-[2.75rem]" aria-hidden />
      )}
      {!denied ? (
        <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <InventoryListPanel
            formId={formId}
            products={products}
            selectedId={selectedId}
            query={query}
            showEmptyHint={status !== 'loading' && products.length === 0 && Boolean(query.trim())}
            onQueryChange={setQuery}
            onSearch={(e) => {
              e.preventDefault();
              void load(query.trim() || undefined);
            }}
            onSelect={(product) => void selectProduct(product)}
          />
          <InventoryFormPanel
            formId={formId}
            statusId={statusId}
            mode={mode}
            form={form}
            busy={busy}
            describedByStatus={
              status === 'validation' || status === 'conflict' || status === 'success'
            }
            categories={categories}
            manufacturers={manufacturers}
            newCategoryName={newCategoryName}
            newManufacturerName={newManufacturerName}
            categoryBusy={categoryBusy}
            manufacturerBusy={manufacturerBusy}
            onChange={onChange}
            onUnitRowsChange={onUnitRowsChange}
            onNewCategoryNameChange={setNewCategoryName}
            onNewManufacturerNameChange={setNewManufacturerName}
            onCreateCategory={() => void onCreateCategory()}
            onCreateManufacturer={() => void onCreateManufacturer()}
            onSave={(e) => void onSave(e)}
            onCancel={cancelForm}
          />
        </div>
      ) : null}
    </div>
  );
}
