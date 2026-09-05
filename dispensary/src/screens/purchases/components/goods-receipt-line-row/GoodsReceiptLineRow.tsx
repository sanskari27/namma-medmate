import { Input, Label } from '@atoms';
import type { GoodsReceiptOutstandingLine } from '@/services/purchaseOrders';
import {
  formatQty,
  isOverQty,
  isRateMismatch,
  remainingAfter,
  type ReceiptLineDraft,
} from '../../GoodsReceipt.utils';

export type GoodsReceiptLineRowProps = {
  formId: string;
  line: GoodsReceiptOutstandingLine;
  draft: ReceiptLineDraft;
  onChange: (patch: Partial<ReceiptLineDraft>) => void;
};

export function GoodsReceiptLineRow({ formId, line, draft, onChange }: GoodsReceiptLineRowProps) {
  const over = isOverQty(line.remainingQuantity, draft.quantity);
  const rateOff = isRateMismatch(line.unitRatePaise, draft.rateRupees);
  const remaining = remainingAfter(line.remainingQuantity, draft.quantity);
  const qtyId = `${formId}-${line.purchaseOrderLineId}-qty`;
  const rateId = `${formId}-${line.purchaseOrderLineId}-rate`;

  return (
    <tr className="border-t border-line">
      <th scope="row" className="px-2 py-2 text-left align-top">
        <span className="block text-sm text-ink">{line.productName}</span>
        <span className="font-mono text-xs text-muted">{line.sku}</span>
      </th>
      <td className="px-2 py-2 font-mono text-sm tabular-nums">
        {formatQty(line.orderedQuantity)}
      </td>
      <td className="px-2 py-2 font-mono text-sm tabular-nums">
        {formatQty(line.receivedQuantity)}
      </td>
      <td className="px-2 py-2">
        <Label htmlFor={qtyId} className="sr-only">
          This delivery
        </Label>
        <Input
          id={qtyId}
          inputMode="decimal"
          value={draft.quantity}
          onChange={(event) => onChange({ quantity: event.target.value })}
          className="h-9 font-mono"
        />
      </td>
      <td className="px-2 py-2">
        <Label htmlFor={rateId} className="sr-only">
          Rate ₹
        </Label>
        <Input
          id={rateId}
          inputMode="decimal"
          value={draft.rateRupees}
          onChange={(event) => onChange({ rateRupees: event.target.value })}
          className="h-9 font-mono"
        />
      </td>
      <td className="px-2 py-2 align-top">
        <span
          aria-label="Remaining"
          className={`font-mono text-sm tabular-nums ${over ? 'text-danger' : 'text-ink'}`}
        >
          {remaining}
        </span>
        {over ? (
          <p className="mt-1 text-xs text-danger">Qty is over remaining on this indent</p>
        ) : null}
        {rateOff ? <p className="mt-1 text-xs text-warn">Rate differs from indent</p> : null}
      </td>
    </tr>
  );
}
