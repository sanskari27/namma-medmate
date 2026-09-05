import {
  getPurchaseReturn,
  listPurchaseReturns,
  type PurchaseReturnDetail,
  type PurchaseReturnSummary,
} from '@/services/purchaseReturns';
import { Ref, useCallback, useEffect, useState } from 'react';
import type { PageStatus } from '../../InventoryScreen.utils';
import { PurchaseReturnCreateDialog } from '../purchase-return-create-dialog';
import { PurchaseReturnDetailPanel } from '../purchase-return-detail';
import { PurchaseReturnList } from '../purchase-return-list';
import { mapReturnStatus } from './PurchaseReturnWorkspace.utils';

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
  const [items, setItems] = useState<PurchaseReturnSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PurchaseReturnDetail | null>(null);

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
  }, [load]);

  async function onSelect(id: string) {
    setSelectedId(id);
    onStatusChange('loading');
    try {
      const next = await getPurchaseReturn(id);
      setDetail(next);
      onStatusChange(null);
    } catch (error) {
      onStatusChange(mapReturnStatus(error));
    }
  }

  if (!allowed || !activeBranchId) {
    return null;
  }

  return (
    <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(16rem,20rem)_1fr]">
      <PurchaseReturnList
        items={items}
        selectedId={selectedId}
        onSelect={(id) => void onSelect(id)}
      />
      {detail ? (
        <PurchaseReturnDetailPanel detail={detail} />
      ) : (
        <p className="text-sm text-muted">
          Select a debit note, or send a pack back from this outlet.
        </p>
      )}
      <PurchaseReturnCreateDialog
        open={createOpen}
        onOpenChange={onCreateOpenChange}
        onCreated={() => {
          void load().then(() => onStatusChange('success'));
        }}
        onCloseFocus={() => {
          if (createButtonRef && 'current' in createButtonRef) {
            createButtonRef.current?.focus();
          }
        }}
      />
    </div>
  );
}
