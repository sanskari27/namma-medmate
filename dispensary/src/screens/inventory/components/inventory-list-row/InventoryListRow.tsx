import { CategoryMark } from '@atoms';
import type { Product } from '@/services/products';

export type InventoryListRowProps = {
  product: Product;
  active: boolean;
  nameId: string;
  metaId: string;
  onSelect: (product: Product) => void;
};

export function InventoryListRow({
  product,
  active,
  nameId,
  metaId,
  onSelect,
}: InventoryListRowProps) {
  return (
    <li>
      <button
        type="button"
        aria-labelledby={`${nameId} ${metaId}`}
        aria-current={active ? 'true' : undefined}
        onClick={() => onSelect(product)}
        className={`flex w-full items-start gap-2 px-3 py-2.5 text-left transition-colors ${
          active ? 'bg-brand-soft' : 'hover:bg-canvas'
        }`}
      >
        <CategoryMark icon={product.categoryIcon} size="sm" className="mt-0.5" />
        <span className="min-w-0 flex-1">
          <span id={nameId} className="block truncate text-sm font-medium text-ink">
            {product.name}
            {product.isDiscontinued ? (
              <span className="ml-2 font-mono text-[10px] tracking-wide text-warn">
                Discontinued
              </span>
            ) : null}
          </span>
          <span id={metaId} className="mt-0.5 block font-mono text-xs tabular-nums text-muted">
            {product.sku}
            {product.barcode ? ` · ${product.barcode}` : ''}
          </span>
        </span>
      </button>
    </li>
  );
}
