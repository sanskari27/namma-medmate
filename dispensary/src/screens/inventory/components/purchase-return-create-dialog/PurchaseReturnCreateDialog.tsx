import { Button } from '@atoms';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@molecules/dialog/Dialog';
import {
  getGoodsReceipt,
  listBranchGoodsReceipts,
  type GoodsReceiptDetail,
  type GoodsReceiptSummary,
} from '@/services/goodsReceipts';
import { createPurchaseReturn } from '@/services/purchaseReturns';
import { FormEvent, useEffect, useId, useState } from 'react';
import { mapReturnStatus } from '../purchase-return-workspace/PurchaseReturnWorkspace.utils';

export type PurchaseReturnCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  onCloseFocus?: () => void;
};

export function PurchaseReturnCreateDialog({
  open,
  onOpenChange,
  onCreated,
  onCloseFocus,
}: PurchaseReturnCreateDialogProps) {
  const formId = useId();
  const [receipts, setReceipts] = useState<GoodsReceiptSummary[]>([]);
  const [receiptId, setReceiptId] = useState('');
  const [detail, setDetail] = useState<GoodsReceiptDetail | null>(null);
  const [qtyByLine, setQtyByLine] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    setReceiptId('');
    setDetail(null);
    setQtyByLine({});
    setBusy(false);
    setError(null);
    void listBranchGoodsReceipts()
      .then((items) => setReceipts(items.filter((row) => row.status === 'CHECKED')))
      .catch(() => setError('Could not load checked deliveries for this outlet.'));
    return undefined;
  }, [open]);

  async function onPickReceipt(id: string) {
    setReceiptId(id);
    setError(null);
    try {
      const next = await getGoodsReceipt(id);
      setDetail(next);
      const qty: Record<string, string> = {};
      next.lines.forEach((line) => {
        qty[line.id] = '';
      });
      setQtyByLine(qty);
    } catch {
      setError('Could not open that delivery.');
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!detail) {
      setError('Pick a checked delivery first.');
      return;
    }
    const lines = detail.lines
      .map((line) => ({
        goodsReceiptLineId: line.id,
        quantity: Number(qtyByLine[line.id] ?? 0),
      }))
      .filter((line) => line.quantity > 0);
    if (lines.length === 0) {
      setError('Enter a quantity to send back.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createPurchaseReturn({
        goodsReceiptId: detail.id,
        idempotencyKey: crypto.randomUUID(),
        lines,
      });
      onCreated();
      onOpenChange(false);
    } catch (caught) {
      const status = mapReturnStatus(caught);
      if (status === 'conflict') {
        setError('Stockist balance changed. Close and try again.');
      } else if (status === 'denied') {
        setError('This till cannot send packs back. Ask the owner for Purchases or Accounts.');
      } else if (status === 'validation') {
        setError('Cannot return more than remaining accepted qty on this delivery.');
      } else {
        setError('Could not send this pack back. Try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  const close = () => {
    onOpenChange(false);
    window.setTimeout(() => onCloseFocus?.(), 0);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          window.setTimeout(() => onCloseFocus?.(), 0);
        }
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogTitle>Send back to stockist</DialogTitle>
        <DialogDescription>
          Confirmed return cuts floor stock now and writes a debit note on the stockist khata.
        </DialogDescription>
        <form id={formId} className="mt-3 grid gap-3" onSubmit={(event) => void onSubmit(event)}>
          <label className="grid gap-1 text-sm">
            <span className="text-ink">Checked delivery</span>
            <select
              id={`${formId}-receipt`}
              className="border border-line bg-surface px-2 py-1.5 text-sm text-ink"
              value={receiptId}
              onChange={(event) => void onPickReceipt(event.target.value)}
            >
              <option value="">Select a delivery</option>
              {receipts.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.receiptNumber} · {row.supplierLegalName}
                </option>
              ))}
            </select>
          </label>
          {detail
            ? detail.lines.map((line) => (
                <label key={line.id} className="grid gap-1 text-sm">
                  <span className="text-ink">
                    {line.productName}{' '}
                    <span className="font-mono text-xs text-muted">
                      accepted {line.acceptedQuantity ?? 0}
                    </span>
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    className="border border-line bg-surface px-2 py-1.5 font-mono text-sm"
                    aria-label={`Return qty for ${line.sku}`}
                    value={qtyByLine[line.id] ?? ''}
                    onChange={(event) =>
                      setQtyByLine((prev) => ({ ...prev, [line.id]: event.target.value }))
                    }
                  />
                </label>
              ))
            : null}
          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              Confirm return
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
