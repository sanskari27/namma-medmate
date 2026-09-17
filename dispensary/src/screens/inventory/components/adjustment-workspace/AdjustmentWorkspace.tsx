import {
  decideStockAdjustment,
  listStockAdjustments,
  type StockAdjustment,
} from '@/services/inventoryAdjustments';
import { isApiError } from '@/services/axios';
import type { AppDispatch, RootState } from '@/store';
import { Plus } from 'lucide-react';
import { Ref, useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { INVENTORY_CONTENT } from '../../InventoryScreen.content';
import { mapApiStatus, type PageStatus } from '../../InventoryScreen.utils';
import {
  bumpInventorySync,
  refreshInventoryAfterMutation,
} from '../../store';
import { AdjustmentCreateDialog } from '../adjustment-create-dialog/AdjustmentCreateDialog';
import { AdjustmentList } from '../adjustment-list/AdjustmentList';
import { InventoryOpsShell, InventoryPrimaryAction } from '../inventory-ops-shell';

export type AdjustmentWorkspaceProps = {
  allowed: boolean;
  activeBranchId: string | null;
  adjustButtonRef: Ref<HTMLButtonElement>;
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
  onStatusChange: (status: PageStatus) => void;
};

export function AdjustmentWorkspace({
  allowed,
  activeBranchId,
  adjustButtonRef,
  createOpen,
  onCreateOpenChange,
  onStatusChange,
}: AdjustmentWorkspaceProps) {
  const dispatch = useDispatch<AppDispatch>();
  const canApprove = useSelector((state: RootState) => state.auth.user?.role === 'pharmacy_owner');
  const [pending, setPending] = useState<StockAdjustment[]>([]);
  const [history, setHistory] = useState<StockAdjustment[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!allowed) {
      onStatusChange('denied');
      return;
    }
    if (!activeBranchId) {
      setPending([]);
      setHistory([]);
      onStatusChange('failure');
      return;
    }
    onStatusChange('loading');
    try {
      const [nextPending, nextHistory] = await Promise.all([
        listStockAdjustments('pending'),
        listStockAdjustments('history'),
      ]);
      setPending(nextPending);
      setHistory(nextHistory);
      onStatusChange(nextPending.length + nextHistory.length === 0 ? 'empty' : null);
    } catch (error) {
      onStatusChange(mapApiStatus(error));
    }
  }, [allowed, activeBranchId, onStatusChange]);

  useEffect(() => {
    void load();
  }, [load]);

  const afterMutation = async () => {
    await load();
    dispatch(bumpInventorySync());
    void dispatch(refreshInventoryAfterMutation());
    onStatusChange('success');
  };

  const runDecide = async (id: string, outcome: 'APPROVED' | 'REJECTED') => {
    const row = pending.find((item) => item.id === id);
    if (!row) {
      return;
    }
    if (outcome === 'APPROVED') {
      const nextOnHand = row.direction === 'OUT' ? `remove ${row.quantity}` : `add ${row.quantity}`;
      if (
        !window.confirm(
          `Approve ${row.direction} ${row.quantity} of ${row.productName} (${nextOnHand} from on-hand)?`,
        )
      ) {
        return;
      }
    }
    setBusyId(id);
    try {
      await decideStockAdjustment(id, { outcome, expectedVersion: row.version });
      await afterMutation();
    } catch (error) {
      if (isApiError(error) && error.status === 409) {
        onStatusChange('conflict');
      } else {
        onStatusChange(mapApiStatus(error));
      }
    } finally {
      setBusyId(null);
    }
  };

  if (!activeBranchId) {
    return (
      <p className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-muted">
        {INVENTORY_CONTENT.noBranch}
      </p>
    );
  }

  return (
    <InventoryOpsShell
      title="Stock write-offs"
      subtitle="Damage, expiry, theft, or count correction — stock moves after sign-off."
      action={
        <InventoryPrimaryAction ref={adjustButtonRef} onClick={() => onCreateOpenChange(true)}>
          <Plus className="size-3.5" aria-hidden />
          Record write-off
        </InventoryPrimaryAction>
      }
    >
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
        <AdjustmentList
          title="Waiting for sign-off"
          emptyLabel="No write-offs waiting on this outlet."
          items={pending}
          busyId={busyId}
          onApprove={canApprove ? (id) => void runDecide(id, 'APPROVED') : undefined}
          onReject={(id) => void runDecide(id, 'REJECTED')}
        />
        <AdjustmentList
          title="History"
          emptyLabel="No approved or rejected write-offs yet."
          items={history}
        />
      </div>
      <AdjustmentCreateDialog
        open={createOpen}
        onOpenChange={onCreateOpenChange}
        onCreated={() => {
          void afterMutation();
        }}
        onCloseFocus={() => {
          if (adjustButtonRef && typeof adjustButtonRef !== 'function') {
            adjustButtonRef.current?.focus();
          }
        }}
      />
    </InventoryOpsShell>
  );
}
