import {
  listStockBalances,
  listStockBatches,
  listStockMovements,
  type StockBalance,
  type StockBatchDetail,
  type StockMovement,
} from '@/services/inventory';
import { isApiError } from '@/services/axios';
import { FormEvent, Ref, useCallback, useEffect, useState } from 'react';
import { FloorStockDetail } from '../floor-stock-detail/FloorStockDetail';
import { FloorStockList } from '../floor-stock-list/FloorStockList';
import { FloorStockMovements } from '../floor-stock-movements/FloorStockMovements';
import { StockReceiveDialog } from '../stock-receive-dialog/StockReceiveDialog';
import { mapApiStatus, type PageStatus } from '../../InventoryScreen.utils';

export type FloorStockWorkspaceProps = {
  allowed: boolean;
  activeBranchId: string | null;
  receiveButtonRef: Ref<HTMLButtonElement>;
  receiveOpen: boolean;
  onReceiveOpenChange: (open: boolean) => void;
  onStatusChange: (status: PageStatus) => void;
};

export function FloorStockWorkspace({
  allowed,
  activeBranchId,
  receiveButtonRef,
  receiveOpen,
  onReceiveOpenChange,
  onStatusChange,
}: FloorStockWorkspaceProps) {
  const [balances, setBalances] = useState<StockBalance[]>([]);
  const [selectedBalance, setSelectedBalance] = useState<StockBalance | null>(null);
  const [batches, setBatches] = useState<StockBatchDetail[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [listStatus, setListStatus] = useState<PageStatus>(null);

  const loadFloor = useCallback(
    async (search?: string) => {
      if (!allowed) {
        onStatusChange('denied');
        return;
      }
      if (!activeBranchId) {
        setBalances([]);
        setSelectedBalance(null);
        setBatches([]);
        setMovements([]);
        onStatusChange('failure');
        return;
      }
      onStatusChange('loading');
      try {
        const items = await listStockBalances(search);
        setBalances(items);
        const next = items.length === 0 ? 'empty' : null;
        setListStatus(next);
        onStatusChange(next);
      } catch (error) {
        if (isApiError(error) && (error.status === 403 || error.code === 'FORBIDDEN')) {
          onStatusChange('denied');
        } else {
          onStatusChange('failure');
        }
      }
    },
    [allowed, activeBranchId, onStatusChange],
  );

  useEffect(() => {
    void loadFloor();
  }, [loadFloor]);

  const selectBalance = async (balance: StockBalance) => {
    setSelectedBalance(balance);
    setDetailLoading(true);
    try {
      const [batchRows, movementRows] = await Promise.all([
        listStockBatches(balance.productId),
        listStockMovements({
          productId: balance.productId,
          batchId: balance.batchId ?? undefined,
        }),
      ]);
      setBatches(batchRows);
      setMovements(movementRows);
    } catch (error) {
      onStatusChange(mapApiStatus(error));
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <>
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <FloorStockList
          balances={balances}
          selectedBalanceId={selectedBalance?.balanceId ?? null}
          query={query}
          showEmptyHint={listStatus !== 'loading' && balances.length === 0 && Boolean(query.trim())}
          onQueryChange={setQuery}
          onSearch={(e: FormEvent) => {
            e.preventDefault();
            void loadFloor(query.trim() || undefined);
          }}
          onSelect={(balance) => void selectBalance(balance)}
        />
        <div className="grid min-h-0 content-start gap-4">
          <FloorStockDetail
            productName={selectedBalance?.productName ?? null}
            productSku={selectedBalance?.productSku ?? null}
            batches={batches}
            loading={detailLoading}
          />
          <FloorStockMovements movements={movements} loading={detailLoading} />
        </div>
      </div>
      <StockReceiveDialog
        open={receiveOpen}
        onOpenChange={onReceiveOpenChange}
        onReceived={() => {
          void loadFloor(query.trim() || undefined).then(() => {
            onStatusChange('success');
          });
        }}
        onCloseFocus={() => {
          if (receiveButtonRef && typeof receiveButtonRef !== 'function') {
            receiveButtonRef.current?.focus();
          }
        }}
      />
    </>
  );
}
