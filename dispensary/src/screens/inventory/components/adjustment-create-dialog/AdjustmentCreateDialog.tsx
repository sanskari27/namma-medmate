import { Button } from '@atoms';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@molecules/dialog/Dialog';
import { listStockBalances, type StockBalance } from '@/services/inventory';
import { createStockAdjustment, type StockAdjustmentReason } from '@/services/inventoryAdjustments';
import { FormEvent, useEffect, useId, useState } from 'react';
import { AdjustmentCreateFields } from './AdjustmentCreateFields';
import {
  adjustmentDialogStatusText,
  mapAdjustmentDialogStatus,
  type AdjustmentDialogStatus,
} from './AdjustmentCreateDialog.utils';

export type AdjustmentCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  onCloseFocus?: () => void;
};

export function AdjustmentCreateDialog({
  open,
  onOpenChange,
  onCreated,
  onCloseFocus,
}: AdjustmentCreateDialogProps) {
  const formId = useId();
  const statusId = `${formId}-status`;
  const [balances, setBalances] = useState<StockBalance[]>([]);
  const [balanceKey, setBalanceKey] = useState('');
  const [reason, setReason] = useState<StockAdjustmentReason>('DAMAGE_BREAKAGE');
  const [direction, setDirection] = useState<'IN' | 'OUT'>('OUT');
  const [quantity, setQuantity] = useState('');
  const [status, setStatus] = useState<AdjustmentDialogStatus>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    setBalanceKey('');
    setReason('DAMAGE_BREAKAGE');
    setDirection('OUT');
    setQuantity('');
    setBusy(false);
    setStatus('loading');
    void listStockBalances()
      .then((items) => {
        setBalances(items);
        setStatus(items.length === 0 ? 'empty' : null);
        window.setTimeout(() => {
          document.getElementById(`${formId}-line`)?.focus();
        }, 0);
      })
      .catch((error) => setStatus(mapAdjustmentDialogStatus(error)));
    return undefined;
  }, [open, formId]);

  const selected = balances.find((row) => row.balanceId === balanceKey) ?? null;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected || !quantity.trim()) {
      setStatus(balances.length === 0 ? 'empty' : 'validation');
      return;
    }
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      setStatus('validation');
      return;
    }
    const nextDirection = reason === 'PHYSICAL_COUNT' ? direction : 'OUT';
    if (nextDirection === 'OUT' && qty > selected.quantity) {
      setStatus('validation');
      return;
    }
    setBusy(true);
    setStatus('loading');
    try {
      await createStockAdjustment({
        productId: selected.productId,
        batchId: selected.batchId,
        reason,
        quantity: qty,
        direction: nextDirection,
        idempotencyKey: `ui-adj-${crypto.randomUUID()}`,
      });
      setStatus('success');
      onCreated();
      onOpenChange(false);
    } catch (error) {
      setStatus(mapAdjustmentDialogStatus(error));
    } finally {
      setBusy(false);
    }
  };

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
        <DialogTitle>Record stock write-off</DialogTitle>
        <DialogDescription>
          Floor quantity stays put until the configured approver signs this off.
        </DialogDescription>
        <form id={formId} className="mt-3 grid gap-3" onSubmit={onSubmit}>
          <AdjustmentCreateFields
            formId={formId}
            balances={balances}
            balanceKey={balanceKey}
            onBalanceKeyChange={setBalanceKey}
            reason={reason}
            onReasonChange={setReason}
            direction={direction}
            onDirectionChange={setDirection}
            quantity={quantity}
            onQuantityChange={setQuantity}
          />
          {adjustmentDialogStatusText(status) ? (
            <p id={statusId} role="status" className="text-sm text-muted">
              {adjustmentDialogStatusText(status)}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || balances.length === 0}>
              Send for sign-off
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
