import { Button, Input, Label } from '@atoms';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@molecules/dialog/Dialog';
import { adjustCustomerLoyalty, isApiError } from '@/services/loyalty';
import { Coins } from 'lucide-react';
import { FormEvent, useEffect, useId, useState } from 'react';
import type { PageStatus } from '../../CustomersScreen.utils';

export type CustomerLoyaltyAdjustDialogProps = {
  open: boolean;
  customerId: string;
  balancePoints: number;
  version: number;
  onOpenChange: (open: boolean) => void;
  onAdjusted: () => void;
  onCloseFocus?: () => void;
};

function parseSignedPoints(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed === '+' || trimmed === '-') {
    return null;
  }
  if (!/^[+-]?\d+$/.test(trimmed)) {
    return null;
  }
  const points = Number(trimmed);
  if (!Number.isFinite(points) || points === 0) {
    return null;
  }
  return points;
}

function statusText(status: PageStatus): string | null {
  switch (status) {
    case 'loading':
      return 'Posting this points change…';
    case 'validation':
      return 'Enter a non-zero points amount and a reason the floor can audit.';
    case 'denied':
      return 'Not on this plan, or only the owner can adjust points.';
    case 'conflict':
      return 'Points changed on another till. Close and open adjust again.';
    case 'failure':
      return 'Could not adjust points. Try again from this counter.';
    case 'success':
      return 'Points updated on this patient.';
    default:
      return null;
  }
}

export function CustomerLoyaltyAdjustDialog({
  open,
  customerId,
  balancePoints,
  version,
  onOpenChange,
  onAdjusted,
  onCloseFocus,
}: CustomerLoyaltyAdjustDialogProps) {
  const formId = useId();
  const statusId = `${formId}-status`;
  const [points, setPoints] = useState('');
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState<PageStatus>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    setPoints('');
    setReason('');
    setBusy(false);
    setStatus(null);
    const t = window.setTimeout(() => {
      document.getElementById(`${formId}-points`)?.focus();
    }, 0);
    return () => window.clearTimeout(t);
  }, [open, formId]);

  function restoreFocus() {
    onCloseFocus?.();
  }

  async function onConfirm(event: FormEvent) {
    event.preventDefault();
    const parsed = parseSignedPoints(points);
    if (parsed == null || !reason.trim()) {
      setStatus('validation');
      return;
    }
    if (balancePoints + parsed < 0) {
      setStatus('validation');
      return;
    }
    setBusy(true);
    setStatus('loading');
    try {
      await adjustCustomerLoyalty(customerId, {
        points: parsed,
        reason: reason.trim(),
        idempotencyKey: crypto.randomUUID(),
        expectedVersion: version,
      });
      setStatus('success');
      onAdjusted();
      onOpenChange(false);
      restoreFocus();
    } catch (error) {
      if (
        isApiError(error) &&
        (error.status === 403 || error.code === 'FORBIDDEN' || error.code === 'PLAN_LIMIT')
      ) {
        setStatus('denied');
      } else if (
        isApiError(error) &&
        (error.status === 409 ||
          error.code === 'STALE_STATE' ||
          error.code === 'IDEMPOTENCY_CONFLICT')
      ) {
        setStatus('conflict');
      } else if (isApiError(error) && (error.status === 400 || error.status === 422)) {
        setStatus('validation');
      } else {
        setStatus('failure');
      }
    } finally {
      setBusy(false);
    }
  }

  const copy = statusText(status);
  const alert = status === 'denied' || status === 'conflict' || status === 'failure';

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
          <Coins className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
          <div>
            <DialogTitle className="font-sans text-base font-semibold text-ink">
              Adjust points
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted">
              Signed amount only. Running balance{' '}
              <span className="font-mono tabular-nums text-ink">{balancePoints} pts</span>.
            </DialogDescription>
          </div>
        </div>

        <form className="grid gap-3" onSubmit={onConfirm} noValidate aria-describedby={statusId}>
          <div
            id={statusId}
            role={copy ? (alert ? 'alert' : 'status') : undefined}
            className="min-h-10 text-sm text-ink"
            aria-live="polite"
          >
            {copy ? <p className="border border-line bg-brand-soft/40 px-3 py-2">{copy}</p> : null}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`${formId}-points`}>Points (+ or −)</Label>
            <Input
              id={`${formId}-points`}
              inputMode="numeric"
              value={points}
              onChange={(event) => setPoints(event.target.value)}
              disabled={busy}
              className="font-mono"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`${formId}-reason`}>Reason</Label>
            <Input
              id={`${formId}-reason`}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              disabled={busy}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? 'Posting…' : 'Post adjustment'}
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
