import { Button, Input, Label } from '@atoms';
import {
  getProductStockLevels,
  updateProductStockLevels,
  type BranchStockLevels,
} from '@/services/inventory';
import { listProducts, type Product } from '@/services/products';
import { useEffect, useId, useState } from 'react';
import { mapApiStatus, type PageStatus } from '../../InventoryScreen.utils';

export type OutletStockLevelsFormProps = {
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onStatusChange: (status: PageStatus) => void;
};

function optionalInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const n = Number(trimmed);
  return Number.isInteger(n) && n >= 0 ? n : Number.NaN;
}

export function OutletStockLevelsForm({
  busy,
  onBusyChange,
  onStatusChange,
}: OutletStockLevelsFormProps) {
  const formId = useId();
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState('');
  const [reorderLevel, setReorderLevel] = useState('');
  const [reorderQuantity, setReorderQuantity] = useState('');
  const [minimumStock, setMinimumStock] = useState('');

  useEffect(() => {
    void listProducts()
      .then(setProducts)
      .catch((error) => onStatusChange(mapApiStatus(error)));
  }, [onStatusChange]);

  const applyLevels = (levels: BranchStockLevels) => {
    setReorderLevel(levels.reorderLevel == null ? '' : String(levels.reorderLevel));
    setReorderQuantity(levels.reorderQuantity == null ? '' : String(levels.reorderQuantity));
    setMinimumStock(levels.minimumStock == null ? '' : String(levels.minimumStock));
  };

  const onProductChange = async (nextId: string) => {
    setProductId(nextId);
    if (!nextId) {
      applyLevels({ reorderLevel: null, reorderQuantity: null, minimumStock: null });
      return;
    }
    onBusyChange(true);
    try {
      applyLevels(await getProductStockLevels(nextId));
    } catch (error) {
      onStatusChange(mapApiStatus(error));
    } finally {
      onBusyChange(false);
    }
  };

  const onSave = async () => {
    if (!productId) {
      onStatusChange('validation');
      return;
    }
    const level = optionalInt(reorderLevel);
    const qty = optionalInt(reorderQuantity);
    const min = optionalInt(minimumStock);
    if (Number.isNaN(level) || Number.isNaN(qty) || Number.isNaN(min)) {
      onStatusChange('validation');
      return;
    }
    onBusyChange(true);
    try {
      applyLevels(
        await updateProductStockLevels(productId, {
          reorderLevel: level,
          reorderQuantity: qty,
          minimumStock: min,
        }),
      );
      onStatusChange('success');
    } catch (error) {
      onStatusChange(mapApiStatus(error));
    } finally {
      onBusyChange(false);
    }
  };

  return (
    <div className="space-y-2 border-t border-line pt-3">
      <h3 className="text-sm font-semibold text-ink">This outlet reorder</h3>
      <p className="text-xs text-muted">
        Overrides catalogue defaults for the active till only. Other outlets keep their own levels.
      </p>
      <Label htmlFor={`${formId}-product`}>Product</Label>
      <select
        id={`${formId}-product`}
        className="h-9 w-full rounded border border-line bg-canvas px-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        value={productId}
        disabled={busy}
        onChange={(event) => void onProductChange(event.target.value)}
      >
        <option value="">Pick a SKU</option>
        {products.map((product) => (
          <option key={product.id} value={product.id}>
            {product.name} ({product.sku})
          </option>
        ))}
      </select>
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label htmlFor={`${formId}-reorder`}>Outlet reorder</Label>
          <Input
            id={`${formId}-reorder`}
            inputMode="numeric"
            value={reorderLevel}
            disabled={busy || !productId}
            onChange={(event) => setReorderLevel(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${formId}-qty`}>Order qty</Label>
          <Input
            id={`${formId}-qty`}
            inputMode="numeric"
            value={reorderQuantity}
            disabled={busy || !productId}
            onChange={(event) => setReorderQuantity(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${formId}-min`}>Outlet min</Label>
          <Input
            id={`${formId}-min`}
            inputMode="numeric"
            value={minimumStock}
            disabled={busy || !productId}
            onChange={(event) => setMinimumStock(event.target.value)}
          />
        </div>
      </div>
      <Button type="button" size="sm" disabled={busy || !productId} onClick={() => void onSave()}>
        Save outlet levels
      </Button>
    </div>
  );
}
