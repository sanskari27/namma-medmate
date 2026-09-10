import { Input } from '@atoms';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@molecules/dialog/Dialog';
import {
  getPurchaseReturn,
  listPurchaseReturns,
  type PurchaseReturnDetail,
  type PurchaseReturnSummary,
} from '@/services/purchaseReturns';
import type { AppDispatch } from '@/store';
import { FileMinus2, Plus, Search, Wallet } from 'lucide-react';
import { Ref, useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { PageStatus } from '../../InventoryScreen.utils';
import {
  bumpInventorySync,
  refreshInventoryAfterMutation,
  selectInventorySyncEpoch,
} from '../../store';
import { PurchaseReturnCreateDialog } from '../purchase-return-create-dialog';
import { PurchaseReturnDetailPanel } from '../purchase-return-detail';
import { PurchaseReturnList } from '../purchase-return-list';
import { InventoryOpsCard, InventoryOpsShell, InventoryPrimaryAction } from '../inventory-ops-shell';
import { formatPaise, mapReturnStatus } from './PurchaseReturnWorkspace.utils';

export type PurchaseReturnWorkspaceProps = {
  allowed: boolean;
  activeBranchId: string | null;
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
  createButtonRef: Ref<HTMLButtonElement>;
  onStatusChange: (status: PageStatus) => void;
};

export function PurchaseReturnWorkspace({
  allowed,
  activeBranchId,
  createOpen,
  onCreateOpenChange,
  createButtonRef,
  onStatusChange,
}: PurchaseReturnWorkspaceProps) {
  const dispatch = useDispatch<AppDispatch>();
  const syncEpoch = useSelector(selectInventorySyncEpoch);
  const [items, setItems] = useState<PurchaseReturnSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PurchaseReturnDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
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
      const rows = await listPurchaseReturns();
      setItems(rows);
      onStatusChange(rows.length === 0 ? 'empty' : null);
    } catch (error) {
      onStatusChange(mapReturnStatus(error));
    }
  }, [allowed, activeBranchId, onStatusChange]);

  useEffect(() => {
    void load();
  }, [load, syncEpoch]);

  async function onSelect(id: string) {
    setSelectedId(id);
    setDetailOpen(true);
    onStatusChange('loading');
    try {
      const next = await getPurchaseReturn(id);
      setDetail(next);
      onStatusChange(null);
    } catch (error) {
      setDetailOpen(false);
      onStatusChange(mapReturnStatus(error));
    }
  }

  const totalPaise = items.reduce((sum, row) => sum + row.amountPaise, 0);

  if (!allowed || !activeBranchId) {
    return null;
  }

  return (
    <InventoryOpsShell
      title="Send back to stockist"
      subtitle="Confirmed return cuts floor stock and writes a debit note on the stockist khata."
      action={
        <InventoryPrimaryAction ref={createButtonRef} onClick={() => onCreateOpenChange(true)}>
          <Plus className="size-3.5" aria-hidden />
          Send back
        </InventoryPrimaryAction>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <article className="flex items-start gap-3 rounded-xl border border-line/70 bg-surface px-4 py-3">
          <span
            className="inline-grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand"
            aria-hidden
          >
            <FileMinus2 className="size-4" />
          </span>
          <div>
            <p className="text-xs text-muted">Debit notes</p>
            <p className="text-xl font-semibold tabular-nums text-ink">{items.length}</p>
            <p className="text-xs text-muted">confirmed on this outlet</p>
          </div>
        </article>
        <article className="flex items-start gap-3 rounded-xl border border-line/70 bg-surface px-4 py-3">
          <span
            className="inline-grid size-9 shrink-0 place-items-center rounded-lg bg-[#e8eef8] text-[#3b5bdb]"
            aria-hidden
          >
            <Wallet className="size-4" />
          </span>
          <div>
            <p className="text-xs text-muted">Total debit value</p>
            <p className="text-xl font-semibold tabular-nums text-ink">{formatPaise(totalPaise)}</p>
            <p className="text-xs text-muted">stockist khata credit</p>
          </div>
        </article>
      </div>

      <label className="relative max-w-md">
        <span className="sr-only">Search debit notes</span>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search debit note or stockist…"
          className="h-9 rounded-lg pl-9"
        />
      </label>

      <InventoryOpsCard title="Debit notes">
        <PurchaseReturnList
          items={items}
          selectedId={selectedId}
          query={query}
          onSelect={(id) => void onSelect(id)}
        />
      </InventoryOpsCard>

      <Dialog
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) {
            setSelectedId(null);
          }
        }}
      >
        <DialogContent className="flex max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl flex-col overflow-hidden p-0">
          <div className="shrink-0 border-b border-line px-5 py-4">
            <DialogTitle className="text-lg font-semibold text-ink">
              {detail?.debitNoteNumber ?? 'Debit note'}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted">
              Confirmed return lines and stockist debit amount.
            </DialogDescription>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {detail ? (
              <PurchaseReturnDetailPanel detail={detail} />
            ) : (
              <p className="text-sm text-muted" role="status">
                Loading debit note…
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <PurchaseReturnCreateDialog
        open={createOpen}
        onOpenChange={onCreateOpenChange}
        onCreated={() => {
          void load().then(() => {
            dispatch(bumpInventorySync());
            void dispatch(refreshInventoryAfterMutation());
            onStatusChange('success');
          });
        }}
        onCloseFocus={() => {
          if (createButtonRef && 'current' in createButtonRef) {
            createButtonRef.current?.focus();
          }
        }}
      />
    </InventoryOpsShell>
  );
}
