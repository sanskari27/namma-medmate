import { Button, Input, Label } from '@atoms';
import type { Product } from '@/services/products';
import { Plus, Trash2 } from 'lucide-react';

interface PosDraftLinesProps {
  query: string;
  onQueryChange: (value: string) => void;
  catalogue: Product[];
  draft: Product[];
  onAdd: (product: Product) => void;
  onRemove: (productId: string) => void;
  busy: boolean;
}

export function PosDraftLines({
  query,
  onQueryChange,
  catalogue,
  draft,
  onAdd,
  onRemove,
  busy,
}: PosDraftLinesProps) {
  const draftIds = new Set(draft.map((item) => item.id));
  return (
    <section
      className="space-y-3 rounded border border-line bg-surface p-3"
      aria-label="Draft medicines"
    >
      <div>
        <h2 className="text-sm font-semibold text-ink">Draft medicines</h2>
        <p className="text-xs text-muted">
          Add lines from this pharmacy’s catalogue. Lines are never removed by warnings.
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
          draft.map((product) => (
            <li
              key={product.id}
              className="flex items-start justify-between gap-2 rounded border border-line px-2 py-2 text-sm"
            >
              <div>
                <p className="font-medium text-ink">{product.name}</p>
                <p className="font-mono text-xs text-muted">{product.sku}</p>
                {product.composition ? (
                  <p className="text-xs text-muted">Composition: {product.composition}</p>
                ) : (
                  <p className="text-xs text-warn">
                    Composition not mapped — check may be incomplete.
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Remove ${product.name}`}
                onClick={() => onRemove(product.id)}
                disabled={busy}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
