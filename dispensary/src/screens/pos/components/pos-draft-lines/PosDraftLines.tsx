import { Button, Input, Label } from '@atoms';
import { ProductUnitSelect } from '@templates';
import type { StockBatchDetail } from '@/services/inventory';
import type { Product, ProductUnit } from '@/services/products';
import type { DiscountType } from '@/services/salesInvoices';
import { Plus, Trash2 } from 'lucide-react';
import { PosLinePricing } from '../pos-line-pricing';

export type PosDraftLine = {
  product: Product;
  unit: ProductUnit;
  quantity: string;
  baseQuantity: number | null;
  unitOptions: ProductUnit[];
  batches: StockBatchDetail[];
  batchId: string | null;
  nearExpiry: boolean;
  mrpRupees: string;
  sellingRupees: string;
  discountRupees: string;
  discountType: DiscountType;
};

interface PosDraftLinesProps {
  query: string;
  onQueryChange: (value: string) => void;
  catalogue: Product[];
  draft: PosDraftLine[];
  onAdd: (product: Product) => void;
  onRemove: (productId: string) => void;
  onUnitChange: (productId: string, unit: ProductUnit) => void;
  onQuantityChange: (productId: string, quantity: string) => void;
  onBatchChange: (productId: string, batchId: string) => void;
  onMrpChange: (productId: string, value: string) => void;
  onSellingChange: (productId: string, value: string) => void;
  onDiscountChange: (productId: string, value: string) => void;
  onDiscountTypeChange: (productId: string, value: DiscountType) => void;
  onTaxOverride: (productId: string) => void;
  busy: boolean;
}

export function PosDraftLines({
  query,
  onQueryChange,
  catalogue,
  draft,
  onAdd,
  onRemove,
  onUnitChange,
  onQuantityChange,
  onBatchChange,
  onMrpChange,
  onSellingChange,
  onDiscountChange,
  onDiscountTypeChange,
  onTaxOverride,
  busy,
}: PosDraftLinesProps) {
  const draftIds = new Set(draft.map((item) => item.product.id));
  return (
    <section
      className="space-y-3 rounded border border-line bg-surface p-3"
      aria-label="Draft medicines"
    >
      <div>
        <h2 className="text-sm font-semibold text-ink">Draft medicines</h2>
        <p className="text-xs text-muted">
          Pick a sale unit and batch, then enter MRP and selling for this till.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="pos-product-search">Find medicine</Label>
        <Input
          id="pos-product-search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Name or SKU"
          disabled={busy}
        />
        <ul className="max-h-36 space-y-1 overflow-auto">
          {catalogue
            .filter((product) => !draftIds.has(product.id))
            .slice(0, 8)
            .map((product) => (
              <li key={product.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded border border-transparent px-2 py-1.5 text-left text-sm hover:border-line hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  onClick={() => onAdd(product)}
                  disabled={busy}
                >
                  <span>
                    <span className="font-medium text-ink">{product.name}</span>
                    <span className="ml-2 font-mono text-xs text-muted">{product.sku}</span>
                  </span>
                  <Plus className="size-4 text-brand" aria-hidden />
                  <span className="sr-only">Add {product.name}</span>
                </button>
              </li>
            ))}
        </ul>
      </div>
      <ul className="space-y-2" aria-label="Draft lines">
        {draft.length === 0 ? (
          <li className="text-sm text-muted">No medicines on this draft yet.</li>
        ) : (
          draft.map((line) => {
            const sellable = line.batches.filter((b) => b.batchId && !b.expired && b.quantity > 0);
            return (
              <li
                key={line.product.id}
                className="space-y-2 rounded border border-line px-2 py-2 text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-ink">{line.product.name}</p>
                    <p className="font-mono text-xs text-muted">{line.product.sku}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`Remove ${line.product.name}`}
                    onClick={() => onRemove(line.product.id)}
                    disabled={busy}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor={`pos-qty-${line.product.id}`}>Qty</Label>
                    <Input
                      id={`pos-qty-${line.product.id}`}
                      inputMode="decimal"
                      value={line.quantity}
                      onChange={(event) => onQuantityChange(line.product.id, event.target.value)}
                      disabled={busy}
                    />
                  </div>
                  <ProductUnitSelect
                    id={`pos-unit-${line.product.id}`}
                    label="Sale unit"
                    value={line.unit}
                    options={line.unitOptions}
                    disabled={busy}
                    onChange={(unit) => onUnitChange(line.product.id, unit)}
                    hint={
                      line.baseQuantity == null
                        ? undefined
                        : `= ${line.baseQuantity} ${line.product.baseUnit}`
                    }
                  />
                </div>
                {line.product.requiresBatchTracking ? (
                  <div className="space-y-1">
                    <Label htmlFor={`pos-batch-${line.product.id}`}>Batch (FEFO suggested)</Label>
                    <select
                      id={`pos-batch-${line.product.id}`}
                      className="h-9 w-full rounded border border-line bg-canvas px-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                      value={line.batchId ?? ''}
                      onChange={(event) => onBatchChange(line.product.id, event.target.value)}
                      disabled={busy || sellable.length === 0}
                    >
                      {sellable.length === 0 ? (
                        <option value="">No sellable batch</option>
                      ) : (
                        sellable.map((batch) => (
                          <option key={batch.batchId!} value={batch.batchId!}>
                            {batch.batchNumber}
                            {batch.expiresOn ? ` · exp ${batch.expiresOn}` : ''}
                            {batch.suggestedFefo ? ' · FEFO' : ''}
                            {batch.nearExpiry ? ' · near expiry' : ''}
                          </option>
                        ))
                      )}
                    </select>
                    {line.nearExpiry ? (
                      <p className="text-xs text-warn" role="status">
                        Near expiry — still sellable. Override batch if needed.
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <PosLinePricing
                  productId={line.product.id}
                  productName={line.product.name}
                  mrpRupees={line.mrpRupees}
                  sellingRupees={line.sellingRupees}
                  discountValue={line.discountRupees}
                  discountType={line.discountType}
                  onMrpChange={(value) => onMrpChange(line.product.id, value)}
                  onSellingChange={(value) => onSellingChange(line.product.id, value)}
                  onDiscountChange={(value) => onDiscountChange(line.product.id, value)}
                  onDiscountTypeChange={(value) => onDiscountTypeChange(line.product.id, value)}
                  busy={busy}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onTaxOverride(line.product.id)}
                  disabled={busy}
                >
                  Tax override
                </Button>
              </li>
            );
          })
        )}
      </ul>
    </section>
  );
}
