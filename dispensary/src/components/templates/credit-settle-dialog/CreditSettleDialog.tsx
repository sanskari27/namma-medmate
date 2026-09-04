import { Button, Input, Label } from '@atoms';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@molecules/dialog/Dialog';
import { formatPaise, isApiError, settleCustomerCredit } from '@/services/credit';
import { Wallet } from 'lucide-react';
import { FormEvent, useEffect, useId, useState } from 'react';
import { CreditSettleDialogStatus } from './CreditSettleDialogStatus';
import type { DialogStatus } from './creditSettleDialog.types';

export type CreditSettleDialogProps = {
  open: boolean;
  customerId: string;
  customerName: string;
  balancePaise: number;
  version: number;
  onOpenChange: (open: boolean) => void;
  onSettled: () => void;
  onCloseFocus?: () => void;
};

function rupeesToPaise(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const rupees = Number(trimmed);
  if (!Number.isFinite(rupees) || rupees <= 0) {
    return null;
  }
  return Math.round(rupees * 100);
}

export function CreditSettleDialog({
  open,
  customerId,
  customerName,
  balancePaise,
  version,
  onOpenChange,
  onSettled,
  onCloseFocus,
}: CreditSettleDialogProps) {
  const formId = useId();
  const statusId = `${formId}-status`;
  const [amountRupees, setAmountRupees] = useState('');
  const [mode, setMode] = useState('CASH');
  const [reference, setReference] = useState('');
  const [status, setStatus] = useState<DialogStatus>(null);
  const [busy, setBusy] = useState(false);

  function restoreFocus() {
    onCloseFocus?.();
  }

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    setAmountRupees(balancePaise > 0 ? String(balancePaise / 100) : '');
    setMode('CASH');
    setReference('');
    setBusy(false);
    setStatus(balancePaise <= 0 ? 'empty' : null);
    const t = window.setTimeout(() => {
      document.getElementById(`${formId}-amount`)?.focus();
    }, 0);
    return () => window.clearTimeout(t);
  }, [open, formId, balancePaise]);

  async function onConfirm(event: FormEvent) {
    event.preventDefault();
    const amountPaise = rupeesToPaise(amountRupees);
    if (amountPaise == null || !mode.trim()) {
      setStatus('validation');
      return;
    }
    if (balancePaise <= 0) {
      setStatus('empty');
      return;
    }
    setBusy(true);
    setStatus('loading');
    try {
      await settleCustomerCredit(customerId, {
        amountPaise,
        mode: mode.trim(),
        reference: reference.trim() || undefined,
        idempotencyKey: crypto.randomUUID(),
        expectedVersion: version,
      });
      setStatus('success');
      onSettled();
      onOpenChange(false);
      restoreFocus();
    } catch (error) {
      if (isApiError(error) && (error.status === 403 || error.code === 'FORBIDDEN')) {
        setStatus('denied');
      } else if (
        isApiError(error) &&
        (error.status === 409 || error.code === 'STALE_STATE' || error.code === 'IDEMPOTENCY_CONFLICT')
      ) {
        setStatus('conflict');
      } else if (
        isApiError(error) &&
        (error.status === 400 || error.status === 422 || error.code === 'OVERPAYMENT')
      ) {
        setStatus('validation');
      } else {
        setStatus('failure');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          restoreFocus();
        }
      }}
    >
      <DialogContent className="max-w-md gap-4 border-line bg-surface p-5">
        <div className="flex items-start gap-3">
          <Wallet className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
          <div>
            <DialogTitle className="font-sans text-base font-semibold text-ink">
              Settle khata
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted">
              Record a partial or full payoff for {customerName}. Outstanding{' '}
              <span className="font-mono tabular-nums text-ink">{formatPaise(balancePaise)}</span>.
            </DialogDescription>
          </div>
        </div>

        <form className="grid gap-3" onSubmit={onConfirm} noValidate aria-describedby={statusId}>
          <div className="grid gap-1.5">
            <Label htmlFor={`${formId}-amount`}>Amount (₹)</Label>
            <Input
              id={`${formId}-amount`}
              inputMode="decimal"
              value={amountRupees}
              onChange={(event) => setAmountRupees(event.target.value)}
              disabled={busy || balancePaise <= 0}
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`${formId}-mode`}>Mode</Label>
            <select
              id={`${formId}-mode`}
              className="h-9 w-full border border-line bg-surface px-2.5 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              value={mode}
              onChange={(event) => setMode(event.target.value)}
              disabled={busy || balancePaise <= 0}
            >
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
              <option value="BANK">Bank transfer</option>
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`${formId}-ref`}>Reference (optional)</Label>
            <Input
              id={`${formId}-ref`}
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              disabled={busy || balancePaise <= 0}
            />
          </div>

          <CreditSettleDialogStatus status={status} statusId={statusId} />

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy || balancePaise <= 0}>
              {busy ? 'Posting…' : 'Post settlement'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => {
                onOpenChange(false);
                restoreFocus();
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
