import { Button, Input, Label } from '@atoms';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@molecules/dialog/Dialog';
import { FormEvent, useEffect, useState } from 'react';

interface PosTaxAdjustDialogProps {
  open: boolean;
  productName: string;
  gstRate: string;
  reason: string;
  onGstRateChange: (value: string) => void;
  onReasonChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  onCloseFocus?: () => void;
  busy: boolean;
}

export function PosTaxAdjustDialog({
  open,
  productName,
  gstRate,
  reason,
  onGstRateChange,
  onReasonChange,
  onOpenChange,
  onSubmit,
  onCloseFocus,
  busy,
}: PosTaxAdjustDialogProps) {
  const [reasonError, setReasonError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setReasonError(null);
      window.setTimeout(() => document.getElementById('pos-tax-rate')?.focus(), 0);
    }
  }, [open]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!reason.trim()) {
      setReasonError('Tax override needs a reason');
      window.setTimeout(() => document.getElementById('pos-tax-reason')?.focus(), 0);
      return;
    }
    setReasonError(null);
    onSubmit();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          onCloseFocus?.();
        }
      }}
    >
      <DialogContent aria-describedby="pos-tax-desc">
        <DialogTitle>Tax override</DialogTitle>
        <DialogDescription id="pos-tax-desc">
          Change GST for {productName} on this till bill. Record why the rate changed.
        </DialogDescription>
        <form className="mt-3 space-y-3" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <Label htmlFor="pos-tax-rate">GST rate %</Label>
            <Input
              id="pos-tax-rate"
              inputMode="decimal"
              value={gstRate}
              onChange={(event) => onGstRateChange(event.target.value)}
              disabled={busy}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pos-tax-reason">Override reason</Label>
            <Input
              id="pos-tax-reason"
              value={reason}
              onChange={(event) => {
                onReasonChange(event.target.value);
                if (reasonError) {
                  setReasonError(null);
                }
              }}
              disabled={busy}
              aria-required
              aria-invalid={Boolean(reasonError)}
              aria-describedby={reasonError ? 'pos-tax-reason-error' : undefined}
            />
            {reasonError ? (
              <p id="pos-tax-reason-error" role="alert" className="text-xs text-danger">
                {reasonError}
              </p>
            ) : null}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              Save tax override
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
