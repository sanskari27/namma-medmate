import { Button } from '@atoms';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@molecules/dialog/Dialog';
import { FormEvent, useEffect, useId, useState } from 'react';

const PAYMENT_MODES = ['CASH', 'UPI', 'NEFT', 'RTGS', 'CHEQUE', 'CARD'] as const;

export type DistributorPaymentDialogProps = {
  open: boolean;
  busy: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: { amountRupees: string; mode: string; reference: string }) => void;
  onCloseFocus?: () => void;
};

export function DistributorPaymentDialog({
  open,
  busy,
  error,
  onOpenChange,
  onSubmit,
  onCloseFocus,
}: DistributorPaymentDialogProps) {
  const formId = useId();
  const [amountRupees, setAmountRupees] = useState('');
  const [mode, setMode] = useState<(typeof PAYMENT_MODES)[number]>('UPI');
  const [reference, setReference] = useState('');

  useEffect(() => {
    if (open) {
      setAmountRupees('');
      setMode('UPI');
      setReference('');
    }
  }, [open]);

  function close() {
    onOpenChange(false);
    window.setTimeout(() => onCloseFocus?.(), 0);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit({ amountRupees, mode, reference });
  }

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
      <DialogContent className="max-w-md">
        <DialogTitle>Record payment</DialogTitle>
        <DialogDescription>
          Partial or full settlement against this stockist khata. Mode and reference stay on the
          line.
        </DialogDescription>
        <form id={formId} className="mt-3 grid gap-3" onSubmit={handleSubmit}>
          <label className="grid gap-1 text-sm">
            <span className="text-ink">Amount (₹)</span>
            <input
              id={`${formId}-amount`}
              type="number"
              min="0"
              step="0.01"
              className="border border-line bg-surface px-2 py-1.5 font-mono text-sm text-ink"
              value={amountRupees}
              onChange={(event) => setAmountRupees(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-ink">Mode</span>
            <select
              id={`${formId}-mode`}
              className="border border-line bg-surface px-2 py-1.5 text-sm text-ink"
              value={mode}
              onChange={(event) => setMode(event.target.value as (typeof PAYMENT_MODES)[number])}
            >
              {PAYMENT_MODES.map((row) => (
                <option key={row} value={row}>
                  {row}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-ink">Reference</span>
            <input
              id={`${formId}-reference`}
              className="border border-line bg-surface px-2 py-1.5 font-mono text-sm text-ink"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              autoComplete="off"
            />
          </label>
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
              Post payment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
