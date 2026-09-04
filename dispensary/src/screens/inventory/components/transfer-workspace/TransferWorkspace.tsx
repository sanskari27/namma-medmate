import {
  cancelStockTransfer,
  confirmStockTransfer,
  dispatchStockTransfer,
  listStockTransfers,
  rejectStockTransfer,
  type StockTransfer,
} from '@/services/stockTransfers';
import { isApiError } from '@/services/axios';
import type { AssignedBranch } from '@/store';
import { Ref, useCallback, useEffect, useState } from 'react';
import { TransferCreateDialog } from '../transfer-create-dialog/TransferCreateDialog';
import { TransferList } from '../transfer-list/TransferList';
import { mapApiStatus, type PageStatus } from '../../InventoryScreen.utils';

export type TransferWorkspaceProps = {
  allowed: boolean;
  activeBranchId: string | null;
  branches: AssignedBranch[];
  transferButtonRef: Ref<HTMLButtonElement>;
  createOpen: boolean;
  onCreateOpenChange: (open: boolean) => void;
  onStatusChange: (status: PageStatus) => void;
};

export function TransferWorkspace({
  allowed,
  activeBranchId,
  branches,
  transferButtonRef,
  createOpen,
  onCreateOpenChange,
  onStatusChange,
}: TransferWorkspaceProps) {
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
  }, [load]);

  const runAction = async (id: string, action: (transferId: string) => Promise<StockTransfer>) => {
    setBusyId(id);
    try {
      await action(id);
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
        onCreated={() => {
          void load().then(() => onStatusChange('success'));
        }}
        onCloseFocus={() => {
          if (transferButtonRef && typeof transferButtonRef !== 'function') {
            transferButtonRef.current?.focus();
          }
        }}
      />
    </div>
  );
}
