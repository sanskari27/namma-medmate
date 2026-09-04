import { Input, Label } from '@atoms';
import type { StockBalance } from '@/services/inventory';
import type { Product } from '@/services/products';
import type { StockTransferDirection } from '@/services/stockTransfers';
import type { AssignedBranch } from '@/store';

export type TransferCreateFieldsProps = {
  formId: string;
  direction: StockTransferDirection;
  onDirectionChange: (direction: StockTransferDirection) => void;
  counterparts: AssignedBranch[];
  counterpartyId: string;
  onCounterpartyChange: (id: string) => void;
  balances: StockBalance[];
  balanceKey: string;
  onBalanceKeyChange: (key: string) => void;
  products: Product[];
  productId: string;
  onProductIdChange: (id: string) => void;
  selectedProduct: Product | null;
  batchId: string;
  onBatchIdChange: (id: string) => void;
  quantity: string;
  onQuantityChange: (value: string) => void;
};

export function TransferCreateFields({
  formId,
  direction,
  onDirectionChange,
  counterparts,
  counterpartyId,
  onCounterpartyChange,
  balances,
  balanceKey,
  onBalanceKeyChange,
  products,
  productId,
  onProductIdChange,
  selectedProduct,
  batchId,
  onBatchIdChange,
  quantity,
  onQuantityChange,
}: TransferCreateFieldsProps) {
  return (
    <>
      <div className="grid gap-1.5">
        <Label htmlFor={`${formId}-direction`}>Direction</Label>
        <select
          id={`${formId}-direction`}
          className="h-10 border border-line bg-canvas px-2 text-sm text-ink"
          value={direction}
          onChange={(e) => onDirectionChange(e.target.value as StockTransferDirection)}
        >
          <option value="PUSH">Push from this outlet</option>
          <option value="PULL">Pull into this outlet</option>
        </select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${formId}-branch`}>Other outlet</Label>
        <select
          id={`${formId}-branch`}
          className="h-10 border border-line bg-canvas px-2 text-sm text-ink"
          value={counterpartyId}
          onChange={(e) => onCounterpartyChange(e.target.value)}
          disabled={counterparts.length === 0}
        >
          {counterparts.length === 0 ? (
            <option value="">No other outlet on this login</option>
          ) : (
            counterparts.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name} ({branch.branchCode})
              </option>
            ))
          )}
        </select>
      </div>
      {direction === 'PUSH' ? (
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-line`}>Stock line on this till</Label>
          <select
            id={`${formId}-line`}
            className="h-10 border border-line bg-canvas px-2 text-sm text-ink"
            value={balanceKey}
            onChange={(e) => onBalanceKeyChange(e.target.value)}
          >
            <option value="">Select a line</option>
            {balances.map((balance) => (
              <option key={balance.balanceId} value={balance.balanceId}>
                {balance.productName}
                {balance.batchNumber ? ` · ${balance.batchNumber}` : ''} · qty {balance.quantity}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <>
          <div className="grid gap-1.5">
            <Label htmlFor={`${formId}-product`}>Product to pull</Label>
            <select
              id={`${formId}-product`}
              className="h-10 border border-line bg-canvas px-2 text-sm text-ink"
              value={productId}
              onChange={(e) => onProductIdChange(e.target.value)}
            >
              <option value="">Select a product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.sku})
                </option>
              ))}
            </select>
          </div>
          {selectedProduct?.requiresBatchTracking ? (
            <div className="grid gap-1.5">
              <Label htmlFor={`${formId}-batch`}>Batch id at sending outlet</Label>
              <Input
                id={`${formId}-batch`}
                value={batchId}
                onChange={(e) => onBatchIdChange(e.target.value)}
                className="font-mono"
              />
            </div>
          ) : null}
        </>
      )}
      <div className="grid gap-1.5">
        <Label htmlFor={`${formId}-qty`}>Quantity</Label>
        <Input
          id={`${formId}-qty`}
          inputMode="decimal"
          value={quantity}
          onChange={(e) => onQuantityChange(e.target.value)}
        />
      </div>
    </>
  );
}
