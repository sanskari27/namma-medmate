import { Button } from '@atoms';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@molecules/dialog/Dialog';
import {
  createFromReorder,
  isApiError,
  previewReorderDrafts,
  type ReorderDraftResult,
} from '@/services/purchaseOrders';
import { FormEvent, useEffect, useId, useState } from 'react';
import { mapApiStatus, type PageStatus } from '../../PurchasesScreen.utils';
import { ReorderDraftPreview } from './ReorderDraftPreview';

export type ReorderDraftDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (result: ReorderDraftResult) => void;
  onCloseFocus?: () => void;
  onPageStatus: (status: PageStatus) => void;
};

export function ReorderDraftDialog({
  open,
  onOpenChange,
  onCreated,
  onCloseFocus,
  onPageStatus,
}: ReorderDraftDialogProps) {
  const formId = useId();
  const statusId = `${formId}-status`;
  const [preview, setPreview] = useState<ReorderDraftResult | null>(null);
  const [status, setStatus] = useState<PageStatus>('loading');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    setPreview(null);
    setBusy(false);
    setStatus('loading');
    void previewReorderDrafts()
      .then((result) => {
        setPreview(result);
        if (result.drafts.length === 0 && result.unmapped.length === 0) {
          setStatus('empty');
        } else {
          setStatus(null);
        }
        window.setTimeout(() => {
          document.getElementById(`${formId}-save`)?.focus();
        }, 0);
      })
      .catch((error) => {
        const next = isApiError(error) ? mapApiStatus(error) : 'failure';
        setStatus(next);
        if (next === 'empty' || (isApiError(error) && error.code === 'REORDER_EMPTY')) {
          setStatus('empty');
        }
      });
    return undefined;
  }, [open, formId]);

  const close = () => {
    onOpenChange(false);
    window.setTimeout(() => onCloseFocus?.(), 0);
  };

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!preview?.fingerprint) {
      setStatus('validation');
      return;
    }
    if (preview.drafts.length === 0) {
      setStatus('empty');
      return;
    }
    setBusy(true);
    try {
      const saved = await createFromReorder(crypto.randomUUID(), preview.fingerprint);
      setPreview(saved);
      setStatus('success');
      onCreated(saved);
      onPageStatus('success');
      onOpenChange(false);
      window.setTimeout(() => onCloseFocus?.(), 0);
    } catch (error) {
      const next = isApiError(error) ? mapApiStatus(error) : 'failure';
      setStatus(next);
      onPageStatus(next);
    } finally {
      setBusy(false);
    }
  }

  const statusText =
    status === 'loading'
      ? 'Reading this outlet’s reorder list…'
      : status === 'empty'
        ? 'Nothing is below reorder on this outlet.'
        : status === 'denied'
          ? 'This outlet’s plan still places indents by hand. Growth drafts from the reorder list.'
          : status === 'conflict'
            ? 'Reorder numbers moved. Preview again before drafting.'
            : status === 'validation'
              ? 'Preview the split before saving drafts.'
              : status === 'failure'
                ? 'Could not reach the server for reorder drafts. Try again.'
                : status === 'success'
                  ? 'Draft indents saved, split by stockist.'
                  : null;

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
      <DialogContent className="max-w-lg" aria-describedby={statusText ? statusId : undefined}>
        <DialogTitle>Draft from reorder</DialogTitle>
        <DialogDescription>
          Split this outlet’s low stock into one indent per stockist. Drafts stay here until you
          issue them.
        </DialogDescription>
        {statusText ? (
          <p
            id={statusId}
            role={status === 'denied' ? 'alert' : 'status'}
            className="mt-3 border border-line bg-canvas px-3 py-2 text-sm text-ink"
          >
            {statusText}
          </p>
        ) : null}
        {preview && status !== 'denied' ? (
          <form id={formId} className="mt-3 grid gap-3" onSubmit={onSubmit}>
            <ReorderDraftPreview preview={preview} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={close}>
                Back to list
              </Button>
              <Button
                id={`${formId}-save`}
                type="submit"
                disabled={busy || preview.drafts.length === 0}
              >
                {busy ? 'Saving drafts…' : 'Save as drafts'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="mt-3 flex justify-end">
            <Button type="button" variant="ghost" onClick={close}>
              Back to list
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
