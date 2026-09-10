import { Button, Input } from '@atoms';
import {
  getGoodsReceipt,
  listBranchGoodsReceipts,
  submitQualityCheck,
  type GoodsReceiptDetail,
  type GoodsReceiptSummary,
} from '@/services/goodsReceipts';
import type { AppDispatch } from '@/store';
import { ClipboardCheck, PackageOpen, Search } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { PageStatus } from '../../InventoryScreen.utils';
import {
  bumpInventorySync,
  refreshInventoryAfterMutation,
  selectInventorySyncEpoch,
} from '../../store';
import { QualityCheckChecklist } from '../quality-check-checklist';
import { QualityCheckConfirmDialog } from '../quality-check-confirm-dialog';
import { QualityCheckLines } from '../quality-check-lines';
import { QualityCheckList } from '../quality-check-list';
import { QualityCheckOutcome } from '../quality-check-outcome';
import { InventoryOpsCard, InventoryOpsShell } from '../inventory-ops-shell';
import {
  draftsFromLines,
  emptyChecklist,
  formatIst,
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
  const dispatch = useDispatch<AppDispatch>();
  const syncEpoch = useSelector(selectInventorySyncEpoch);
  const formId = useId();
  const acceptRef = useRef<HTMLButtonElement | null>(null);
  const [items, setItems] = useState<GoodsReceiptSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<GoodsReceiptDetail | null>(null);
  const [drafts, setDrafts] = useState<QcLineDraft[]>([]);
  const [checklist, setChecklist] = useState<QcChecklistState>(emptyChecklist);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');

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
  }, [loadList, syncEpoch]);

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
      dispatch(bumpInventorySync());
      void dispatch(refreshInventoryAfterMutation());
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
    <InventoryOpsShell
      title="Quality check"
      subtitle="Inspect GRN deliveries before they hit the shelf. Accept onto floor when clear."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <article className="flex items-start gap-3 rounded-xl border border-line/70 bg-surface px-4 py-3">
          <span
            className="inline-grid size-9 shrink-0 place-items-center rounded-lg bg-[#fff1e6] text-warn"
            aria-hidden
          >
            <ClipboardCheck className="size-4" />
          </span>
          <div>
            <p className="text-xs text-muted">Pending QC</p>
            <p className="text-xl font-semibold tabular-nums text-ink">{items.length}</p>
            <p className="text-xs text-muted">deliveries waiting</p>
          </div>
        </article>
        <article className="flex items-start gap-3 rounded-xl border border-line/70 bg-surface px-4 py-3">
          <span
            className="inline-grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand"
            aria-hidden
          >
            <PackageOpen className="size-4" />
          </span>
          <div>
            <p className="text-xs text-muted">Selected GRN</p>
            <p className="truncate text-xl font-semibold text-ink">
              {detail?.receiptNumber ?? '—'}
            </p>
            <p className="truncate text-xs text-muted">
              {detail ? detail.supplierLegalName : 'Pick a delivery from the queue'}
            </p>
          </div>
        </article>
      </div>

      <label className="relative max-w-md">
        <span className="sr-only">Search pending deliveries</span>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search GRN, reference, or stockist…"
          className="h-9 rounded-lg pl-9"
        />
      </label>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(16rem,22rem)_1fr]">
        <InventoryOpsCard title={`Queue · ${items.length}`}>
          <div className="max-h-[32rem] overflow-auto lg:max-h-none">
            <QualityCheckList
              items={items}
              selectedId={selectedId}
              query={query}
              onSelect={(id) => void onSelect(id)}
            />
          </div>
        </InventoryOpsCard>

        {detail ? (
          <InventoryOpsCard
            title={detail.receiptNumber}
            headerAction={
              readOnly ? null : (
                <Button
                  ref={acceptRef}
                  type="button"
                  size="sm"
                  className="rounded-lg"
                  disabled={busy}
                  onClick={onAcceptClick}
                >
                  Accept onto floor
                </Button>
              )
            }
          >
            <div className="space-y-4 overflow-auto p-4" aria-label="Delivery check">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <p className="text-ink">{detail.supplierLegalName}</p>
                <p className="text-muted">{detail.receiptReference}</p>
                <p className="text-xs text-muted">Received {formatIst(detail.createdAt)}</p>
              </div>
              {readOnly ? <QualityCheckOutcome detail={detail} /> : null}
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
            </div>
          </InventoryOpsCard>
        ) : (
          <div className="flex min-h-[16rem] items-center justify-center rounded-xl border border-dashed border-line bg-surface/60 px-6 text-center text-sm text-muted">
            Select a delivery from the queue to start inspection.
          </div>
        )}
      </div>

      <QualityCheckConfirmDialog
        open={confirmOpen}
        busy={busy}
        onOpenChange={setConfirmOpen}
        onConfirm={() => void onConfirm()}
        onCloseFocus={() => acceptRef.current?.focus()}
      />
    </InventoryOpsShell>
  );
}
