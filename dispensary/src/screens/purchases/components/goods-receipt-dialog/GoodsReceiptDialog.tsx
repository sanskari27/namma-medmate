import { Button } from '@atoms';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@molecules/dialog/Dialog';
import {
  createGoodsReceipt,
  isApiError,
  listGoodsReceipts,
  type GoodsReceipts,
} from '@/services/purchaseOrders';
import { FormEvent, useEffect, useId, useState } from 'react';
import type { PageStatus } from '../../PurchasesScreen.utils';
import {
  draftsFromLines,
  hasPending,
  mapReceiptStatus,
  receiptStatusText,
  toNumber,
  validateDelivery,
  type ReceiptLineDraft,
} from '../../GoodsReceipt.utils';
import { GoodsReceiptPanel } from '../goods-receipt-panel';

export type GoodsReceiptDialogProps = {
  open: boolean;
  purchaseOrderId: string | null;
  onOpenChange: (open: boolean) => void;
  onRecorded: () => void;
  onCloseFocus?: () => void;
};

export function GoodsReceiptDialog({
  open,
  purchaseOrderId,
  onOpenChange,
  onRecorded,
  onCloseFocus,
}: GoodsReceiptDialogProps) {
  const formId = useId();
  const statusId = `${formId}-status`;
  const [detail, setDetail] = useState<GoodsReceipts | null>(null);
  const [drafts, setDrafts] = useState<ReceiptLineDraft[]>([]);
  const [reference, setReference] = useState('');
  const [status, setStatus] = useState<PageStatus>('loading');
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !purchaseOrderId) {
      return undefined;
    }
    setDetail(null);
    setDrafts([]);
    setReference('');
    setBusy(false);
    setErrorCode(null);
    setStatus('loading');
    void listGoodsReceipts(purchaseOrderId)
      .then((result) => {
        setDetail(result);
        setDrafts(draftsFromLines(result.lines));
        setStatus(hasPending(result.lines) ? null : 'empty');
      })
      .catch((error) => {
        const next = isApiError(error) ? mapReceiptStatus(error) : 'failure';
        setErrorCode(isApiError(error) ? error.code : null);
        setStatus(next);
      });
    return undefined;
  }, [open, purchaseOrderId]);

  const close = () => {
    onOpenChange(false);
    window.setTimeout(() => onCloseFocus?.(), 0);
  };

  function onDraftChange(purchaseOrderLineId: string, patch: Partial<ReceiptLineDraft>) {
    setDrafts((prev) =>
      prev.map((row) =>
        row.purchaseOrderLineId === purchaseOrderLineId ? { ...row, ...patch } : row,
      ),
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!purchaseOrderId || !detail) {
      return;
    }
    if (!validateDelivery(reference, detail.lines, drafts)) {
      setErrorCode(null);
      setStatus('validation');
      return;
    }
    setBusy(true);
    try {
      await createGoodsReceipt(purchaseOrderId, {
        receiptReference: reference.trim(),
        idempotencyKey: crypto.randomUUID(),
        lines: drafts
          .filter((draft) => toNumber(draft.quantity) > 0)
          .map((draft) => ({
            purchaseOrderLineId: draft.purchaseOrderLineId,
            quantity: toNumber(draft.quantity),
            unitRatePaise: Math.round(toNumber(draft.rateRupees) * 100),
          })),
      });
      setErrorCode(null);
      setStatus('success');
      onRecorded();
    } catch (error) {
      const next = isApiError(error) ? mapReceiptStatus(error) : 'failure';
      setErrorCode(isApiError(error) ? error.code : null);
      setStatus(next);
    } finally {
      setBusy(false);
    }
  }

  const statusText = receiptStatusText(status, errorCode);
  const showForm = Boolean(detail) && status !== 'denied';

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
      <DialogContent className="max-w-3xl" aria-describedby={statusText ? statusId : undefined}>
        <DialogTitle>Record delivery</DialogTitle>
        <DialogDescription>
          Cross-check this stockist delivery against the issued indent. Packs stay pending QC and do
          not go on the shelf yet.
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
        {showForm ? (
          <GoodsReceiptPanel
            formId={formId}
            stockistName={detail?.supplierLegalName ?? ''}
            poNumber={detail?.poNumber ?? ''}
            reference={reference}
            busy={busy}
            canSave={status !== 'empty'}
            lines={detail?.lines ?? []}
            drafts={drafts}
            onReferenceChange={setReference}
            onDraftChange={onDraftChange}
            onCancel={close}
            onSubmit={onSubmit}
          />
        ) : (
          <div className="mt-3 flex justify-end">
            <Button type="button" variant="ghost" onClick={close}>
              Back to indent
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
