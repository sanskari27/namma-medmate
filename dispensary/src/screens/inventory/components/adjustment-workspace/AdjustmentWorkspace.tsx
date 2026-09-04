import {
  decideStockAdjustment,
  listStockAdjustments,
  type StockAdjustment,
} from '@/services/inventoryAdjustments';
import { isApiError } from '@/services/axios';
import { Ref, useCallback, useEffect, useState } from 'react';
import { AdjustmentCreateDialog } from '../adjustment-create-dialog/AdjustmentCreateDialog';
import { AdjustmentList } from '../adjustment-list/AdjustmentList';
import { mapApiStatus, type PageStatus } from '../../InventoryScreen.utils';

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

  const runDecide = async (id: string, outcome: 'APPROVED' | 'REJECTED') => {
    const row = pending.find((item) => item.id === id);
    if (!row) {
      return;
    }
    setBusyId(id);
    try {
      await decideStockAdjustment(id, { outcome, expectedVersion: row.version });
      await load();
      onStatusChange('success');
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
    return null;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
        <AdjustmentList
          title="Waiting for sign-off"
          emptyLabel="No write-offs waiting on this outlet."
          items={pending}
          busyId={busyId}
          onApprove={(id) => void runDecide(id, 'APPROVED')}
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
          void load().then(() => onStatusChange('success'));
        }}
        onCloseFocus={() => {
          if (adjustButtonRef && typeof adjustButtonRef !== 'function') {
            adjustButtonRef.current?.focus();
          }
        }}
      />
    </div>
  );
}
