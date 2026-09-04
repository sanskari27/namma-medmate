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
import { FormEvent, Ref, useCallback, useEffect, useId, useState } from 'react';
import { InventoryFormPanel } from '../inventory-form-panel';
import { InventoryListPanel } from '../inventory-list-panel';
import {
  applyUnitsToForm,
  emptyForm,
  mapApiStatus,
  toForm,
  toInput,
  validateForm,
  type FormState,
  type PageStatus,
  type UnitRow,
} from '../../InventoryScreen.utils';

export type CatalogueWorkspaceProps = {
  allowed: boolean;
  addButtonRef: Ref<HTMLButtonElement>;
  onStatusChange: (status: PageStatus) => void;
  createRequest?: number;
};

export function CatalogueWorkspace({
  allowed,
  addButtonRef,
  onStatusChange,
  createRequest = 0,
}: CatalogueWorkspaceProps) {
  const formId = useId();
  const statusId = useId();
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
  const [status, setStatus] = useState<PageStatus>(null);

  const setBoth = useCallback(
    (next: PageStatus) => {
      setStatus(next);
      onStatusChange(next);
    },
    [onStatusChange],
  );

  const loadCatalogue = useCallback(
    async (search?: string) => {
      if (!allowed) {
        setBoth('denied');
        return;
      }
      setBoth('loading');
      try {
        const [items, cats, mfrs] = await Promise.all([
          listProducts(search),
          listProductCategories(),
          listManufacturers(),
        ]);
        setProducts(items);
        setCategories(cats);
        setManufacturers(mfrs);
        setBoth(items.length === 0 ? 'empty' : null);
      } catch (error) {
        setBoth(
          isApiError(error) && (error.status === 403 || error.code === 'FORBIDDEN')
            ? 'denied'
            : 'failure',
        );
      }
    },
    [allowed, setBoth],
  );

  useEffect(() => {
    void loadCatalogue();
  }, [loadCatalogue]);

  useEffect(() => {
    if (createRequest <= 0) return;
    setSelectedId(null);
    setForm(emptyForm);
    setMode('create');
    setBoth(null);
  }, [createRequest, setBoth]);

  const onChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const selectProduct = async (product: Product) => {
    setSelectedId(product.id);
    setForm(toForm(product));
    setMode('edit');
    setBoth('loading');
    try {
      const units = await listProductUnits(product.id);
      setForm(applyUnitsToForm(toForm(product), units));
      setBoth(null);
    } catch (error) {
      setBoth(mapApiStatus(error));
    }
  };

  const cancelForm = () => {
    setMode('idle');
    setSelectedId(null);
    setForm(emptyForm);
    if (addButtonRef && typeof addButtonRef !== 'function') {
      addButtonRef.current?.focus();
    }
  };

  const onSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!validateForm(form)) {
      setBoth('validation');
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
      await loadCatalogue(query.trim() || undefined);
      setSelectedId(saved.id);
      setForm(applyUnitsToForm(toForm(saved), units));
      setMode('edit');
      setStatus('success');
      onStatusChange('success');
    } catch (error) {
      setBoth(mapApiStatus(error));
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
      setBoth('failure');
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
      setBoth('failure');
    } finally {
      setManufacturerBusy(false);
    }
  };

  return (
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
          void loadCatalogue(query.trim() || undefined);
        }}
        onSelect={(product) => void selectProduct(product)}
      />
      <InventoryFormPanel
        formId={formId}
        statusId={statusId}
        mode={mode}
        form={form}
        busy={busy}
        describedByStatus={status === 'validation' || status === 'conflict' || status === 'success'}
        categories={categories}
        manufacturers={manufacturers}
        newCategoryName={newCategoryName}
        newManufacturerName={newManufacturerName}
        categoryBusy={categoryBusy}
        manufacturerBusy={manufacturerBusy}
        onChange={onChange}
        onUnitRowsChange={(rows: UnitRow[]) => setForm((prev) => ({ ...prev, unitRows: rows }))}
        onNewCategoryNameChange={setNewCategoryName}
        onNewManufacturerNameChange={setNewManufacturerName}
        onCreateCategory={() => void onCreateCategory()}
        onCreateManufacturer={() => void onCreateManufacturer()}
        onSave={(e) => void onSave(e)}
        onCancel={cancelForm}
      />
    </div>
  );
}
