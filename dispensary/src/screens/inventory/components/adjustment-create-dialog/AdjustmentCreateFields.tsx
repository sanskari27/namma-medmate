import { Input, Label } from '@atoms';
import type { StockBalance } from '@/services/inventory';
import type { StockAdjustmentReason } from '@/services/inventoryAdjustments';
import { ADJUSTMENT_REASONS } from '../../InventoryScreen.utils';

export type AdjustmentCreateFieldsProps = {
  formId: string;
  balances: StockBalance[];
  balanceKey: string;
  onBalanceKeyChange: (key: string) => void;
  reason: StockAdjustmentReason;
  onReasonChange: (reason: StockAdjustmentReason) => void;
  direction: 'IN' | 'OUT';
  onDirectionChange: (direction: 'IN' | 'OUT') => void;
  quantity: string;
  onQuantityChange: (value: string) => void;
};

export function AdjustmentCreateFields({
  formId,
  balances,
  balanceKey,
  onBalanceKeyChange,
  reason,
  onReasonChange,
  direction,
  onDirectionChange,
  quantity,
  onQuantityChange,
}: AdjustmentCreateFieldsProps) {
  return (
    <>
      <div className="grid gap-1.5">
        <Label htmlFor={`${formId}-line`}>Stock line on this till</Label>
        <select
          id={`${formId}-line`}
          className="h-9 border border-line bg-surface px-2 text-sm text-ink"
          value={balanceKey}
          onChange={(event) => onBalanceKeyChange(event.target.value)}
        >
          <option value="">Select a line</option>
          {balances.map((row) => (
            <option key={row.balanceId} value={row.balanceId}>
              {row.productName} · {row.batchNumber ?? 'no batch'} · {row.quantity} on hand
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${formId}-reason`}>Reason</Label>
        <select
          id={`${formId}-reason`}
          className="h-9 border border-line bg-surface px-2 text-sm text-ink"
          value={reason}
          onChange={(event) => onReasonChange(event.target.value as StockAdjustmentReason)}
        >
          {ADJUSTMENT_REASONS.map((row) => (
            <option key={row.value} value={row.value}>
              {row.label}
            </option>
          ))}
        </select>
      </div>
      {reason === 'PHYSICAL_COUNT' ? (
        <div className="grid gap-1.5">
          <Label htmlFor={`${formId}-direction`}>Count direction</Label>
          <select
            id={`${formId}-direction`}
            className="h-9 border border-line bg-surface px-2 text-sm text-ink"
            value={direction}
            onChange={(event) => onDirectionChange(event.target.value as 'IN' | 'OUT')}
          >
            <option value="OUT">Remove from book stock</option>
            <option value="IN">Add to book stock</option>
          </select>
        </div>
      ) : null}
      <div className="grid gap-1.5">
        <Label htmlFor={`${formId}-quantity`}>Quantity</Label>
        <Input
          id={`${formId}-quantity`}
          value={quantity}
          onChange={(event) => onQuantityChange(event.target.value)}
          inputMode="decimal"
          className="font-mono text-sm"
        />
      </div>
    </>
  );
}
