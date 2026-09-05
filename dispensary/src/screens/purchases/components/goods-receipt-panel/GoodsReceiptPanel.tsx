import { Button, Input, Label } from '@atoms';
import type { GoodsReceiptOutstandingLine } from '@/services/purchaseOrders';
import type { FormEvent } from 'react';
import type { ReceiptLineDraft } from '../../GoodsReceipt.utils';
import { GoodsReceiptLineRow } from '../goods-receipt-line-row';

export type GoodsReceiptPanelProps = {
  formId: string;
  stockistName: string;
  poNumber: string;
  reference: string;
  busy: boolean;
  canSave: boolean;
  lines: GoodsReceiptOutstandingLine[];
  drafts: ReceiptLineDraft[];
  onReferenceChange: (value: string) => void;
  onDraftChange: (purchaseOrderLineId: string, patch: Partial<ReceiptLineDraft>) => void;
  onCancel: () => void;
  onSubmit: (event: FormEvent) => void;
};

export function GoodsReceiptPanel({
  formId,
  stockistName,
  poNumber,
  reference,
  busy,
  canSave,
  lines,
  drafts,
  onReferenceChange,
  onDraftChange,
  onCancel,
  onSubmit,
}: GoodsReceiptPanelProps) {
  return (
    <form id={formId} className="mt-3 grid gap-3" onSubmit={onSubmit}>
      <div className="grid gap-0.5">
        <p className="font-mono text-sm text-ink">{poNumber}</p>
        <p className="text-sm text-muted">{stockistName}</p>
      </div>
      <div className="grid gap-1">
        <Label htmlFor={`${formId}-ref`}>Challan / invoice ref</Label>
        <Input
          id={`${formId}-ref`}
          value={reference}
          onChange={(event) => onReferenceChange(event.target.value)}
          autoComplete="off"
        />
      </div>
      <div className="overflow-x-auto border border-line">
        <table className="w-full min-w-[36rem] border-collapse text-sm">
          <caption className="sr-only">Outstanding packs on this indent</caption>
          <thead className="bg-canvas text-left text-xs text-muted">
            <tr>
              <th scope="col" className="px-2 py-2 font-medium">
                Pack
              </th>
              <th scope="col" className="px-2 py-2 font-medium">
                Ordered
              </th>
              <th scope="col" className="px-2 py-2 font-medium">
                Previously received
              </th>
              <th scope="col" className="px-2 py-2 font-medium">
                This delivery
              </th>
              <th scope="col" className="px-2 py-2 font-medium">
                Rate ₹
              </th>
              <th scope="col" className="px-2 py-2 font-medium">
                Remaining
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <GoodsReceiptLineRow
                key={line.purchaseOrderLineId}
                formId={formId}
                line={line}
                draft={
                  drafts[index] ?? {
                    purchaseOrderLineId: line.purchaseOrderLineId,
                    quantity: '',
                    rateRupees: String(line.unitRatePaise / 100),
                  }
                }
                onChange={(patch) => onDraftChange(line.purchaseOrderLineId, patch)}
              />
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
          Back to indent
        </Button>
        <Button type="submit" disabled={busy || !canSave}>
          {busy ? 'Saving delivery…' : 'Save delivery'}
        </Button>
      </div>
    </form>
  );
}
