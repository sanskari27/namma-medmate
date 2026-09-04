import { Button, Input, Label } from '@atoms';
import type { Product } from '@/services/products';
import { Search } from 'lucide-react';
import { FormEvent } from 'react';
import { InventoryListRow } from '../inventory-list-row';

export type InventoryListPanelProps = {
  formId: string;
  products: Product[];
  selectedId: string | null;
  query: string;
  showEmptyHint: boolean;
  onQueryChange: (value: string) => void;
  onSearch: (event: FormEvent) => void;
  onSelect: (product: Product) => void;
};

export function InventoryListPanel({
  formId,
  products,
  selectedId,
  query,
  showEmptyHint,
  onQueryChange,
  onSearch,
  onSelect,
}: InventoryListPanelProps) {
  return (
    <section
      aria-label="Product list"
      className="flex h-full min-h-0 flex-col border border-line bg-surface"
    >
      <form className="flex items-center gap-2 border-b border-line px-3 py-2" onSubmit={onSearch}>
        <Label htmlFor={`${formId}-search`} className="sr-only">
          Search products
        </Label>
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <Input
            id={`${formId}-search`}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Name, SKU, or barcode"
            className="h-9 pl-8"
          />
        </div>
        <Button type="submit" variant="outline" className="shrink-0">
          Search
        </Button>
      </form>

      <ul className="panel-scroll min-h-0 flex-1 divide-y divide-line overflow-y-auto">
        {products.map((product) => (
          <InventoryListRow
            key={product.id}
            product={product}
            active={selectedId === product.id}
            nameId={`${formId}-row-${product.id}-name`}
            metaId={`${formId}-row-${product.id}-meta`}
            onSelect={onSelect}
          />
        ))}
      </ul>

      {showEmptyHint ? (
        <p className="border-t border-line px-3 py-6 text-sm text-muted">
          No matching products on this floor.
        </p>
      ) : null}
    </section>
  );
}
