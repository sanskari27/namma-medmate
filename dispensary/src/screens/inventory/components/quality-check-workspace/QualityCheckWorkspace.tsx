import { Button } from '@atoms';
import {
  getGoodsReceipt,
  listBranchGoodsReceipts,
  submitQualityCheck,
  type GoodsReceiptDetail,
  type GoodsReceiptSummary,
} from '@/services/goodsReceipts';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { PageStatus } from '../../InventoryScreen.utils';
import { QualityCheckChecklist } from '../quality-check-checklist';
import { QualityCheckConfirmDialog } from '../quality-check-confirm-dialog';
import { QualityCheckLines } from '../quality-check-lines';
import { QualityCheckList } from '../quality-check-list';
import { QualityCheckOutcome } from '../quality-check-outcome';
import {
  draftsFromLines,
  emptyChecklist,
  mapQcStatus,
  toNumber,
  validateQc,
  type QcChecklistState,
  type QcLineDraft,
} from './QualityCheckWorkspace.utils';

export type QualityCheckWorkspaceProps = {
  allowed: boolean;
  activeBranchId: string | null;
  onStatusChange: (status: PageStatus) => void;
};

export function QualityCheckWorkspace({
  allowed,
  activeBranchId,
  onStatusChange,
}: QualityCheckWorkspaceProps) {
  const formId = useId();
  const acceptRef = useRef<HTMLButtonElement | null>(null);
  const [items, setItems] = useState<GoodsReceiptSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<GoodsReceiptDetail | null>(null);
  const [drafts, setDrafts] = useState<QcLineDraft[]>([]);
  const [checklist, setChecklist] = useState<QcChecklistState>(emptyChecklist);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadList = useCallback(async () => {
    if (!allowed) {
      onStatusChange('denied');
      return;
    }
    if (!activeBranchId) {
      setItems([]);
      setDetail(null);
      onStatusChange('failure');
      return;
    }
    onStatusChange('loading');
    try {
      const rows = await listBranchGoodsReceipts();
      const pending = rows.filter((row) => row.status === 'PENDING_QC');
      setItems(pending);
      onStatusChange(pending.length === 0 ? 'empty' : null);
    } catch (error) {
      onStatusChange(mapQcStatus(error));
    }
  }, [allowed, activeBranchId, onStatusChange]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  async function onSelect(id: string) {
    setSelectedId(id);
    setConfirmOpen(false);
    onStatusChange('loading');
    try {
      const next = await getGoodsReceipt(id);
      setDetail(next);
      setDrafts(draftsFromLines(next.lines));
      setChecklist(emptyChecklist);
      onStatusChange(null);
    } catch (error) {
      onStatusChange(mapQcStatus(error));
    }
  }

  function onDraftChange(goodsReceiptLineId: string, patch: Partial<QcLineDraft>) {
    setDrafts((prev) =>
      prev.map((row) =>
        row.goodsReceiptLineId === goodsReceiptLineId ? { ...row, ...patch } : row,
      ),
    );
  }

  function onAcceptClick() {
    if (!detail) {
      return;
    }
    if (!validateQc(detail, drafts, checklist)) {
      onStatusChange('validation');
      return;
    }
    setConfirmOpen(true);
  }

  async function onConfirm() {
    if (!detail) {
      return;
    }
    setBusy(true);
    try {
      const result = await submitQualityCheck(detail.id, {
        idempotencyKey: crypto.randomUUID(),
        visualInspectionPassed: checklist.visualInspectionPassed,
        checklist: {
          packagingIntact: checklist.packagingIntact,
          labelMatches: checklist.labelMatches,
          batchReadable: checklist.batchReadable,
          noDamage: checklist.noDamage,
        },
        lines: drafts.map((draft) => ({
          goodsReceiptLineId: draft.goodsReceiptLineId,
          acceptedQuantity: toNumber(draft.accepted),
          rejectedQuantity: toNumber(draft.rejected),
          batchNumber: draft.batchNumber.trim() || null,
          manufacturedOn: draft.manufacturedOn || null,
          expiresOn: draft.expiresOn || null,
        })),
      });
      setDetail(result);
      setItems((prev) => prev.filter((row) => row.id !== result.id));
      setConfirmOpen(false);
      onStatusChange('success');
    } catch (error) {
      setConfirmOpen(false);
      onStatusChange(mapQcStatus(error));
    } finally {
      setBusy(false);
    }
  }

  const readOnly = detail?.status === 'CHECKED';

  if (!allowed || !activeBranchId) {
    return null;
  }

  return (
    <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(16rem,20rem)_1fr]">
      <QualityCheckList
        items={items}
        selectedId={selectedId}
        onSelect={(id) => void onSelect(id)}
      />
      {detail ? (
        <section className="min-h-0 overflow-auto" aria-label="Delivery check">
          <div className="mb-3">
            <p className="font-mono text-sm text-ink">{detail.receiptNumber}</p>
            <p className="text-sm text-muted">{detail.receiptReference}</p>
            <p className="text-sm text-muted">{detail.supplierLegalName}</p>
          </div>
          {readOnly ? <QualityCheckOutcome detail={detail} /> : null}
          <div className="mt-3 grid gap-3">
            <QualityCheckChecklist
              formId={formId}
              checklist={checklist}
              readOnly={readOnly}
              onChange={(patch) => setChecklist((prev) => ({ ...prev, ...patch }))}
            />
            <QualityCheckLines
              formId={formId}
              lines={detail.lines}
              drafts={drafts}
              readOnly={readOnly}
              onChange={onDraftChange}
            />
            {readOnly ? null : (
              <div className="flex justify-end">
                <Button ref={acceptRef} type="button" disabled={busy} onClick={onAcceptClick}>
                  Accept onto floor
                </Button>
              </div>
            )}
          </div>
        </section>
      ) : (
        <p className="text-sm text-muted">Select a delivery to inspect.</p>
      )}
      <QualityCheckConfirmDialog
        open={confirmOpen}
        busy={busy}
        onOpenChange={setConfirmOpen}
        onConfirm={() => void onConfirm()}
        onCloseFocus={() => acceptRef.current?.focus()}
      />
    </div>
  );
}
