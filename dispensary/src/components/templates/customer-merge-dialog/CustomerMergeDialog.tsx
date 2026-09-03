import { Button, Label } from '@atoms';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@molecules/dialog/Dialog';
import {
  executeCustomerMerge,
  isApiError,
  previewCustomerMerge,
  type Customer,
  type CustomerMergePreview,
  type MergeSide,
} from '@/services/customers';
import { FormEvent, useEffect, useId, useMemo, useState } from 'react';
import { MergeConflictFields } from './MergeConflictFields';
import { MergeDialogStatus } from './MergeDialogStatus';
import type { DialogStatus } from './mergeDialog.types';

export type CustomerMergeDialogProps = {
  open: boolean;
  survivor: Customer | null;
  candidates: Customer[];
  onOpenChange: (open: boolean) => void;
  onMerged: (survivor: Customer) => void;
  onCloseFocus?: () => void;
};

export function CustomerMergeDialog({
  open,
  survivor,
  candidates,
  onOpenChange,
  onMerged,
  onCloseFocus,
}: CustomerMergeDialogProps) {
  const formId = useId();
  const [duplicateId, setDuplicateId] = useState<string | null>(null);
  const [preview, setPreview] = useState<CustomerMergePreview | null>(null);
  const [resolutions, setResolutions] = useState<Record<string, MergeSide>>({});
  const [status, setStatus] = useState<DialogStatus>(null);
  const [busy, setBusy] = useState(false);

  const others = useMemo(
    () => candidates.filter((row) => row.id !== survivor?.id),
    [candidates, survivor?.id],
  );

  function restoreFocus() {
    onCloseFocus?.();
  }

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    setDuplicateId(null);
    setPreview(null);
    setResolutions({});
    setBusy(false);
    if (!survivor) {
      setStatus('validation');
      return undefined;
    }
    if (others.length === 0) {
      setStatus('empty');
      return undefined;
    }
    setStatus(null);
    const t = window.setTimeout(() => {
      document.getElementById(`${formId}-duplicate`)?.focus();
    }, 0);
    return () => window.clearTimeout(t);
  }, [open, survivor, others.length, formId]);

  async function loadPreview(nextDuplicateId: string) {
    if (!survivor) {
      return;
    }
    setBusy(true);
    setStatus('loading');
    setPreview(null);
    setResolutions({});
    try {
      const next = await previewCustomerMerge(survivor.id, nextDuplicateId);
      setPreview(next);
      const initial: Record<string, MergeSide> = {};
      for (const field of next.conflicts) {
        initial[field] = 'SURVIVOR';
      }
      setResolutions(initial);
      setStatus(null);
    } catch (error) {
      if (isApiError(error) && (error.status === 403 || error.code === 'FORBIDDEN')) {
        setStatus('denied');
      } else if (
        isApiError(error) &&
        (error.status === 409 || error.code === 'STALE_STATE' || error.code === 'PHONE_TAKEN')
      ) {
        setStatus('conflict');
      } else {
        setStatus('failure');
      }
    } finally {
      setBusy(false);
    }
  }

  async function onSelectDuplicate(nextId: string) {
    setDuplicateId(nextId);
    if (!nextId) {
      setPreview(null);
      setStatus(others.length === 0 ? 'empty' : null);
      return;
    }
    await loadPreview(nextId);
  }

  async function onConfirm(event: FormEvent) {
    event.preventDefault();
    if (!survivor || !duplicateId || !preview) {
      setStatus('validation');
      return;
    }
    for (const field of preview.conflicts) {
      if (!resolutions[field]) {
        setStatus('validation');
        return;
      }
    }
    setBusy(true);
    setStatus(null);
    try {
      const merged = await executeCustomerMerge(survivor.id, duplicateId, resolutions);
      setStatus('success');
      onMerged(merged);
      onOpenChange(false);
      restoreFocus();
    } catch (error) {
      if (isApiError(error) && error.code === 'MERGE_CONFLICTS') {
        setStatus('validation');
      } else if (isApiError(error) && (error.status === 403 || error.code === 'FORBIDDEN')) {
        setStatus('denied');
      } else if (
        isApiError(error) &&
        (error.status === 409 || error.code === 'STALE_STATE' || error.code === 'PHONE_TAKEN')
      ) {
        setStatus('conflict');
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
        className="max-w-xl max-h-[90vh] overflow-y-auto"
        aria-describedby={`${formId}-desc`}
      >
        <DialogTitle className="font-sans text-lg font-semibold text-ink">
          Merge duplicate profile
        </DialogTitle>
        <DialogDescription id={`${formId}-desc`} className="mt-1 text-sm text-muted">
          Keep one walk-in on this pharmacy floor. Review conflicting fields, then confirm. Linked
          slips move to the survivor; the other profile is deactivated.
        </DialogDescription>

        <MergeDialogStatus status={status} />

        {survivor ? (
          <form className="mt-4 grid gap-4" onSubmit={onConfirm} noValidate>
            <div className="border border-line bg-canvas px-3 py-2 text-sm">
              <p className="font-medium text-ink">Survivor (keep)</p>
              <p className="mt-0.5 text-muted">
                {survivor.name} · <span className="font-mono tabular-nums">{survivor.phone}</span>
              </p>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor={`${formId}-duplicate`}>Duplicate to deactivate</Label>
              <select
                id={`${formId}-duplicate`}
                className="h-10 w-full border border-line bg-surface px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                value={duplicateId ?? ''}
                disabled={busy || others.length === 0}
                onChange={(event) => {
                  void onSelectDuplicate(event.target.value);
                }}
              >
                <option value="">Select a duplicate…</option>
                {others.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name} · {row.phone}
                  </option>
                ))}
              </select>
            </div>

            {preview ? (
              <MergeConflictFields
                formId={formId}
                preview={preview}
                resolutions={resolutions}
                onResolve={(field, side) => setResolutions((prev) => ({ ...prev, [field]: side }))}
              />
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={busy || status === 'denied'}>
                {busy ? 'Merging…' : 'Confirm merge'}
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
