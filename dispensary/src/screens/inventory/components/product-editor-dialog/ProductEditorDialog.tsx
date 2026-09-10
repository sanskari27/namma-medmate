import { Button } from '@atoms';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@molecules/dialog/Dialog';
import type { AppDispatch } from '@/store';
import {
  createManufacturer,
  listManufacturers,
  type Manufacturer,
} from '@/services/manufacturers';
import {
  createProductCategory,
  listProductCategories,
  type ProductCategory,
} from '@/services/productCategories';
import type { ProductUnit } from '@/services/products';
import { FormEvent, useEffect, useId, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  applyUnitsToForm,
  emptyForm,
  toForm,
  toInput,
  validateForm,
  type FormState,
  type UnitRow,
} from '../../InventoryScreen.utils';
import { InventoryClassificationFields } from '../inventory-classification-fields';
import { InventoryIdentityFields } from '../inventory-identity-fields';
import { InventoryOpsFields } from '../inventory-ops-fields';
import { InventoryTaxPackFields } from '../inventory-tax-pack-fields';
import { InventoryUnitConversions } from '../inventory-unit-conversions';
import {
  closeProductEditor,
  loadProductForEditor,
  saveProductEditor,
  selectCatalogue,
  selectProductEditor,
} from '../../store';

export function ProductEditorDialog() {
  const dispatch = useDispatch<AppDispatch>();
  const editor = useSelector(selectProductEditor);
  const catalogue = useSelector(selectCatalogue);
  const formId = useId();
  const statusId = useId();

  const [form, setForm] = useState<FormState>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('💊');
  const [newManufacturerName, setNewManufacturerName] = useState('');
  const [categoryBusy, setCategoryBusy] = useState(false);
  const [manufacturerBusy, setManufacturerBusy] = useState(false);

  useEffect(() => {
    if (!editor.open) return;
    setError(null);
    setNewCategoryName('');
    setNewManufacturerName('');
    setCategories(catalogue.categories);
    setManufacturers(catalogue.manufacturers);

    if (editor.mode === 'create') {
      setForm(emptyForm);
      setLoading(false);
      if (catalogue.categories.length === 0) {
        void Promise.all([listProductCategories(), listManufacturers()]).then(([cats, mfrs]) => {
          setCategories(cats);
          setManufacturers(mfrs);
        });
      }
      return;
    }

    if (!editor.productId) return;
    setLoading(true);
    void dispatch(loadProductForEditor(editor.productId))
      .unwrap()
      .then(({ product, units }) => {
        setForm(applyUnitsToForm(toForm(product), units));
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(
          typeof err === 'string'
            ? err
            : err instanceof Error
              ? err.message
              : 'Could not load product.',
        );
        setLoading(false);
      });
  }, [editor.open, editor.mode, editor.productId, catalogue.categories, catalogue.manufacturers, dispatch]);

  const onChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!validateForm(form)) {
      setError('Fill required catalogue fields before saving.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await dispatch(
        saveProductEditor({
          mode: editor.mode,
          productId: editor.productId,
          input: toInput(form),
          quantityPrecision: Number(form.quantityPrecision),
          units: form.unitRows.map((row) => ({
            unit: row.unit as ProductUnit,
            factorToBase: Number(row.factorToBase),
          })),
        }),
      ).unwrap();
    } catch (message) {
      setError(
        typeof message === 'string'
          ? message
          : message instanceof Error
            ? message.message
            : 'Could not save product.',
      );
    } finally {
      setBusy(false);
    }
  };

  const onCreateCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    setCategoryBusy(true);
    try {
      const created = await createProductCategory(name, newCategoryIcon.trim() || null);
      setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      onChange('categoryId', created.id);
      setNewCategoryName('');
      setNewCategoryIcon('💊');
    } catch {
      setError('Could not create category.');
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
      setError('Could not create manufacturer.');
    } finally {
      setManufacturerBusy(false);
    }
  };

  return (
    <Dialog
      open={editor.open}
      onOpenChange={(open) => {
        if (!open) dispatch(closeProductEditor());
      }}
    >
      <DialogContent className="flex max-h-[90vh] w-[calc(100%-2rem)] max-w-3xl flex-col overflow-hidden p-0">
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={onSave} noValidate>
          <div className="shrink-0 border-b border-line px-5 py-4">
            <DialogTitle className="text-lg font-semibold text-ink">
              {editor.mode === 'create' ? 'New product' : 'Edit product'}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted">
              Dense catalogue fields for this pharmacy floor. Changes sync to Stock immediately.
            </DialogDescription>
          </div>

          <div className="panel-scroll min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {loading ? (
              <p className="text-sm text-muted" role="status">
                Loading product…
              </p>
            ) : (
              <fieldset disabled={busy || loading} className="grid gap-5">
                <InventoryIdentityFields formId={formId} form={form} onChange={onChange} />
                <InventoryClassificationFields
                  formId={formId}
                  form={form}
                  categories={categories}
                  manufacturers={manufacturers}
                  newCategoryName={newCategoryName}
                  newCategoryIcon={newCategoryIcon}
                  newManufacturerName={newManufacturerName}
                  categoryBusy={categoryBusy}
                  manufacturerBusy={manufacturerBusy}
                  onChange={onChange}
                  onNewCategoryNameChange={setNewCategoryName}
                  onNewCategoryIconChange={setNewCategoryIcon}
                  onNewManufacturerNameChange={setNewManufacturerName}
                  onCreateCategory={() => void onCreateCategory()}
                  onCreateManufacturer={() => void onCreateManufacturer()}
                />
                <InventoryTaxPackFields formId={formId} form={form} onChange={onChange} />
                <InventoryUnitConversions
                  formId={formId}
                  form={form}
                  onChange={onChange}
                  onUnitRowsChange={(rows: UnitRow[]) => onChange('unitRows', rows)}
                />
                <InventoryOpsFields formId={formId} form={form} onChange={onChange} />
              </fieldset>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3">
            <p id={statusId} className="text-sm text-danger" role="status">
              {error}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => dispatch(closeProductEditor())}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy || loading}>
                {busy ? 'Saving…' : editor.mode === 'create' ? 'Create product' : 'Save product'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
