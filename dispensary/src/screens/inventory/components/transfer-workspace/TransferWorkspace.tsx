import {
  cancelStockTransfer,
  confirmStockTransfer,
  dispatchStockTransfer,
  listStockTransfers,
  rejectStockTransfer,
  type StockTransfer,
} from '@/services/stockTransfers';
import { isApiError } from '@/services/axios';
import type { AppDispatch, AssignedBranch } from '@/store';
import { Plus } from 'lucide-react';
import { Ref, useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { mapApiStatus, type PageStatus } from '../../InventoryScreen.utils';
import {
  bumpInventorySync,
  refreshInventoryAfterMutation,
  selectInventorySyncEpoch,
} from '../../store';
import { TransferCreateDialog } from '../transfer-create-dialog/TransferCreateDialog';
import { TransferList } from '../transfer-list/TransferList';
import { InventoryOpsShell, InventoryPrimaryAction } from '../inventory-ops-shell';

export type TransferWorkspaceProps = {
  allowed: boolean;
  activeBranchId: string | null;
  branches: AssignedBranch[];
  transferButtonRef: Ref<HTMLButtonElement>;
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
  onStatusChange: (status: PageStatus) => void;
  prefillProductId?: string | null;
};

export function TransferWorkspace({
  allowed,
  activeBranchId,
  branches,
  transferButtonRef,
  createOpen,
  onCreateOpenChange,
  onStatusChange,
  prefillProductId = null,
}: TransferWorkspaceProps) {
  const dispatch = useDispatch<AppDispatch>();
  const syncEpoch = useSelector(selectInventorySyncEpoch);
  const [outgoing, setOutgoing] = useState<StockTransfer[]>([]);
  const [incoming, setIncoming] = useState<StockTransfer[]>([]);
  const [history, setHistory] = useState<StockTransfer[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const branchName = useCallback(
    (id: string) => branches.find((b) => b.id === id)?.name ?? id.slice(0, 8),
    [branches],
  );

  const load = useCallback(async () => {
    if (!allowed) {
      onStatusChange('denied');
      return;
    }
    if (!activeBranchId) {
      setOutgoing([]);
      setIncoming([]);
      setHistory([]);
      onStatusChange('failure');
      return;
    }
    onStatusChange('loading');
    try {
      const [out, inn, hist] = await Promise.all([
        listStockTransfers('outgoing'),
        listStockTransfers('incoming'),
        listStockTransfers('history'),
      ]);
      setOutgoing(out);
      setIncoming(inn);
      setHistory(hist);
      onStatusChange(out.length + inn.length + hist.length === 0 ? 'empty' : null);
    } catch (error) {
      onStatusChange(mapApiStatus(error));
    }
  }, [allowed, activeBranchId, onStatusChange]);

  useEffect(() => {
    void load();
  }, [load, syncEpoch]);

  const afterMutation = async () => {
    await load();
    dispatch(bumpInventorySync());
    void dispatch(refreshInventoryAfterMutation());
    onStatusChange('success');
  };

  const runAction = async (id: string, action: (transferId: string) => Promise<StockTransfer>) => {
    setBusyId(id);
    try {
      await action(id);
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
    return null;
  }

  return (
    <InventoryOpsShell
      title="Outlet transfers"
      subtitle="Push or pull stock between outlets. Receiving till confirms before stock lands."
      action={
        <InventoryPrimaryAction
          ref={transferButtonRef}
          onClick={() => onCreateOpenChange(true)}
        >
          <Plus className="size-3.5" aria-hidden />
          Start transfer
        </InventoryPrimaryAction>
      }
    >
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
        <TransferList
          title="Outgoing"
          emptyLabel="No outgoing transfers from this outlet."
          items={outgoing}
          branchName={branchName}
          activeBranchId={activeBranchId}
          busyId={busyId}
          onDispatch={(id) => void runAction(id, dispatchStockTransfer)}
          onCancel={(id) => void runAction(id, cancelStockTransfer)}
        />
        <TransferList
          title="Incoming"
          emptyLabel="No incoming transfers waiting on this outlet."
          items={incoming}
          branchName={branchName}
          activeBranchId={activeBranchId}
          busyId={busyId}
          onConfirm={(id) => void runAction(id, confirmStockTransfer)}
          onReject={(id) => void runAction(id, rejectStockTransfer)}
          onCancel={(id) => void runAction(id, cancelStockTransfer)}
        />
      </div>
      <TransferList
        title="History"
        emptyLabel="No completed, rejected, or cancelled transfers yet."
        items={history}
        branchName={branchName}
        activeBranchId={activeBranchId}
      />
      <TransferCreateDialog
        open={createOpen}
        onOpenChange={onCreateOpenChange}
        branches={branches}
        activeBranchId={activeBranchId}
        prefillProductId={prefillProductId}
        onCreated={() => {
          void afterMutation();
        }}
        onCloseFocus={() => {
          if (transferButtonRef && typeof transferButtonRef !== 'function') {
            transferButtonRef.current?.focus();
          }
        }}
      />
    </InventoryOpsShell>
  );
}
