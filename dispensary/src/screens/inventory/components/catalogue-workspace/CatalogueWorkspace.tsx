import { Button, CategoryMark, Input } from '@atoms';
import type { AppDispatch } from '@/store';
import { Pencil, Plus, Search } from 'lucide-react';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { PageStatus } from '../../InventoryScreen.utils';
import {
  loadCatalogue,
  openProductEditor,
  selectCatalogue,
  selectFilteredCatalogueProducts,
  selectInventorySyncEpoch,
  setCatalogueQuery,
  setWorkspaceStatus,
} from '../../store';
import { InventoryOpsShell } from '../inventory-ops-shell';

export type CatalogueWorkspaceProps = {
  allowed: boolean;
  onStatusChange: (status: PageStatus) => void;
};

export function CatalogueWorkspace({ allowed, onStatusChange }: CatalogueWorkspaceProps) {
  const dispatch = useDispatch<AppDispatch>();
  const catalogue = useSelector(selectCatalogue);
  const products = useSelector(selectFilteredCatalogueProducts);
  const syncEpoch = useSelector(selectInventorySyncEpoch);

  useEffect(() => {
    if (!allowed) {
      onStatusChange('denied');
      return;
    }
    void dispatch(loadCatalogue(undefined));
  }, [allowed, dispatch, onStatusChange, syncEpoch]);

  useEffect(() => {
    onStatusChange(catalogue.status);
    dispatch(setWorkspaceStatus({ status: catalogue.status }));
  }, [catalogue.status, dispatch, onStatusChange]);

  return (
    <InventoryOpsShell
      title="Catalogue"
      subtitle="Tenant product master — search, add, and edit SKUs in a dialog."
      action={
        <Button
          type="button"
          className="rounded-lg"
          onClick={() => dispatch(openProductEditor({ mode: 'create' }))}
        >
          <Plus className="size-3.5" aria-hidden />
          Add product
        </Button>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[14rem] flex-1">
          <span className="sr-only">Search catalogue</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <Input
            value={catalogue.query}
            onChange={(e) => dispatch(setCatalogueQuery(e.target.value))}
            placeholder="Search by name, SKU, or barcode…"
            className="h-9 rounded-lg pl-9"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-line/70 bg-surface">
        <table className="w-full min-w-[48rem] border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-brand-soft/80 backdrop-blur-sm">
            <tr>
              {['Product', 'SKU', 'Schedule', 'Rack', 'Status', ''].map((label, i) => (
                <th
                  key={`${label}-${i}`}
                  className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted">
                  {catalogue.status === 'loading'
                    ? 'Loading catalogue…'
                    : 'No products match this search.'}
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="border-b border-line/60 last:border-0">
                  <td className="px-3 py-3">
                    <div className="flex items-start gap-2.5">
                      <CategoryMark icon={product.categoryIcon} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">{product.name}</p>
                        <p className="truncate text-xs text-muted">
                          {[product.genericName, product.brandName].filter(Boolean).join(' · ') ||
                            '—'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-muted">{product.sku}</td>
                  <td className="px-3 py-3">
                    <span className="inline-flex rounded-full border border-brand/30 bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand">
                      {product.scheduleClassification ??
                        (product.prescriptionRequired ? 'Rx' : 'OTC')}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-sm text-muted">{product.rackLocation || '—'}</td>
                  <td className="px-3 py-3 text-sm">
                    {product.isActive ? (
                      <span className="text-brand">Active</span>
                    ) : (
                      <span className="text-muted">Inactive</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-1 px-2 text-muted hover:text-ink"
                      onClick={() =>
                        dispatch(openProductEditor({ mode: 'edit', productId: product.id }))
                      }
                    >
                      <Pencil className="size-3.5" aria-hidden />
                      Edit
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </InventoryOpsShell>
  );
}
