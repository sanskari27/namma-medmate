import { Button, Label } from '@atoms';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@molecules/dialog/Dialog';
import {
  addFamilyMember,
  createCustomerFamily,
  isApiError,
  type CustomerFamily,
} from '@/services/customerFamilies';
import type { Customer } from '@/services/customers';
import { Users } from 'lucide-react';
import { FormEvent, useEffect, useId, useMemo, useState } from 'react';
import { FamilyDialogStatus } from './FamilyDialogStatus';
import type { DialogStatus } from './familyDialog.types';

export type CustomerFamilyDialogProps = {
  open: boolean;
  primary: Customer | null;
  candidates: Customer[];
  existingFamily: CustomerFamily | null;
  onOpenChange: (open: boolean) => void;
  onLinked: (family: CustomerFamily) => void;
  onCloseFocus?: () => void;
};

export function CustomerFamilyDialog({
  open,
  primary,
  candidates,
  existingFamily,
  onOpenChange,
  onLinked,
  onCloseFocus,
}: CustomerFamilyDialogProps) {
  const formId = useId();
  const [memberId, setMemberId] = useState<string>('');
  const [status, setStatus] = useState<DialogStatus>(null);
  const [busy, setBusy] = useState(false);

  const others = useMemo(() => {
    const taken = new Set(existingFamily?.members.map((m) => m.id) ?? []);
    if (primary) {
      taken.add(primary.id);
    }
    return candidates.filter((row) => !taken.has(row.id));
  }, [candidates, existingFamily, primary]);

  function restoreFocus() {
    onCloseFocus?.();
  }

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    setMemberId('');
    setBusy(false);
    if (!primary) {
      setStatus('validation');
      return undefined;
    }
    if (others.length === 0) {
      setStatus('empty');
      return undefined;
    }
    setStatus(null);
    const t = window.setTimeout(() => {
      document.getElementById(`${formId}-member`)?.focus();
    }, 0);
    return () => window.clearTimeout(t);
  }, [open, primary, others.length, formId]);

  async function onConfirm(event: FormEvent) {
    event.preventDefault();
    if (!primary || !memberId) {
      setStatus('validation');
      return;
    }
    setBusy(true);
    setStatus('loading');
    try {
      const family = existingFamily
        ? await addFamilyMember(existingFamily.id, memberId)
        : await createCustomerFamily([primary.id, memberId]);
      setStatus('success');
      onLinked(family);
      onOpenChange(false);
      restoreFocus();
    } catch (error) {
      if (isApiError(error) && (error.status === 403 || error.code === 'FORBIDDEN')) {
        setStatus('denied');
      } else if (
        isApiError(error) &&
        (error.status === 409 || error.code === 'ALREADY_IN_FAMILY')
      ) {
        setStatus('conflict');
      } else if (isApiError(error) && (error.status === 400 || error.code === 'SELF_LINK')) {
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
      <DialogContent
        className="max-w-md max-h-[90vh] overflow-y-auto"
        aria-describedby={`${formId}-desc`}
      >
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center border border-line bg-brand-soft text-brand">
            <Users className="size-4" aria-hidden />
          </div>
          <div className="min-w-0">
            <DialogTitle className="font-sans text-lg font-semibold text-ink">
              Link family member
            </DialogTitle>
            <DialogDescription id={`${formId}-desc`} className="mt-1 text-sm text-muted">
              Keep separate walk-in profiles. Link dependents so purchase and prescription history
              can roll up under one household view.
            </DialogDescription>
          </div>
        </div>

        <FamilyDialogStatus status={status} />

        {primary ? (
          <form className="mt-4 grid gap-4" onSubmit={onConfirm} noValidate>
            <div className="border border-line border-l-2 border-l-brand bg-canvas px-3 py-2.5 text-sm">
              <p className="font-mono text-[10px] tracking-wide text-muted">Primary on this card</p>
              <p className="mt-1 font-medium text-ink">{primary.name}</p>
              <p className="mt-0.5 font-mono text-xs tabular-nums text-muted">{primary.phone}</p>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor={`${formId}-member`}>Dependent to link</Label>
              <select
                id={`${formId}-member`}
                className="h-10 w-full border border-line bg-surface px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                value={memberId}
                disabled={busy || others.length === 0}
                onChange={(event) => setMemberId(event.target.value)}
              >
                <option value="">Select a customer…</option>
                {others.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name} · {row.phone}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-2 border-t border-line pt-4">
              <Button type="submit" disabled={busy || status === 'denied' || status === 'empty'}>
                {busy ? 'Linking…' : 'Link member'}
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
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
