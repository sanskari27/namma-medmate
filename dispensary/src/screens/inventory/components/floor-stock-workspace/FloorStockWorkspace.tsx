import type { AppDispatch } from '@/store';
import {
  listStockBatches,
  listStockMovements,
  type StockBatchDetail,
  type StockMovement,
} from '@/services/inventory';
import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { INVENTORY_CONTENT } from '../../InventoryScreen.content';
import { downloadInventoryCsv } from '../../InventoryScreen.format';
import type { PageStatus } from '../../InventoryScreen.utils';
import {
  loadInventoryOverview,
  openProductEditor,
  refreshInventoryAfterMutation,
  selectFilteredInventoryRows,
  selectInventoryFilter,
  selectInventoryFlagBusyId,
  selectInventoryQuery,
  selectInventoryStatus,
  selectInventoryStatusHint,
  selectInventorySummary,
  selectInventorySyncEpoch,
  setInventoryFilter,
  setInventoryQuery,
  updateListingFlags,
} from '../../store';
import { FloorStockDetail } from '../floor-stock-detail/FloorStockDetail';
import { FloorStockMovements } from '../floor-stock-movements/FloorStockMovements';
import { InventoryFilterTabs } from '../inventory-filter-tabs';
import { InventoryKpiCards } from '../inventory-kpi-cards';
import { InventoryStockTable } from '../inventory-stock-table';
import { InventoryToolbar } from '../inventory-toolbar';
import { StockReceiveDialog } from '../stock-receive-dialog/StockReceiveDialog';

export type FloorStockWorkspaceProps = {
  allowed: boolean;
  activeBranchId: string | null;
  onStatusChange: (status: PageStatus) => void;
};

export function FloorStockWorkspace({
  allowed,
  activeBranchId,
  onStatusChange,
}: FloorStockWorkspaceProps) {
  const dispatch = useDispatch<AppDispatch>();
  const summary = useSelector(selectInventorySummary);
  const rows = useSelector(selectFilteredInventoryRows);
  const filter = useSelector(selectInventoryFilter);
  const query = useSelector(selectInventoryQuery);
  const status = useSelector(selectInventoryStatus);
  const statusHint = useSelector(selectInventoryStatusHint);
  const flagBusyId = useSelector(selectInventoryFlagBusyId);
  const syncEpoch = useSelector(selectInventorySyncEpoch);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [detailProductId, setDetailProductId] = useState<string | null>(null);
  const [batches, setBatches] = useState<StockBatchDetail[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const reload = useCallback(() => {
    if (!allowed) {
      onStatusChange('denied');
      return;
    }
    void dispatch(loadInventoryOverview());
  }, [allowed, activeBranchId, dispatch, onStatusChange]);

  useEffect(() => {
    reload();
  }, [reload, syncEpoch]);

  const openBatches = (productId: string) => {
    setDetailProductId(productId);
    setDetailLoading(true);
    void Promise.all([listStockBatches(productId), listStockMovements({ productId })])
      .then(([nextBatches, nextMovements]) => {
        setBatches(nextBatches);
        setMovements(nextMovements);
      })
      .finally(() => setDetailLoading(false));
  };

  const emptyMessage =
    status === 'loading'
      ? 'Loading floor stock for this outlet…'
      : status === 'empty'
        ? INVENTORY_CONTENT.empty
        : filter !== 'all' || query.trim()
          ? INVENTORY_CONTENT.emptyFilter
          : INVENTORY_CONTENT.empty;

  const detailRow = rows.find((row) => row.productId === detailProductId) ?? null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <InventoryKpiCards summary={summary} />
      <InventoryFilterTabs
        filter={filter}
        alertCount={summary?.alertCount ?? 0}
        onChange={(next) => dispatch(setInventoryFilter(next))}
      />
      <InventoryToolbar
        query={query}
        onQueryChange={(value) => dispatch(setInventoryQuery(value))}
        onExcel={() => downloadInventoryCsv(rows)}
        onPdf={() => window.print()}
        onRackLocations={() => dispatch(setInventoryFilter('unallocated'))}
        onAddProduct={() => dispatch(openProductEditor({ mode: 'create' }))}
        onReceive={activeBranchId ? () => setReceiveOpen(true) : undefined}
      />
      {statusHint && status === 'failure' ? (
        <p className="rounded-lg border border-danger/30 bg-[#fde8e8] px-3 py-2 text-sm text-danger">
          {statusHint}
        </p>
      ) : null}
      <InventoryStockTable
        rows={rows}
        flagBusyId={flagBusyId}
        emptyMessage={emptyMessage}
        onToggleLoose={(productId, next) => {
          void dispatch(updateListingFlags({ productId, looseSellingEnabled: next }));
        }}
        onToggleOnline={(productId, next) => {
          void dispatch(updateListingFlags({ productId, onlineListed: next }));
        }}
        onEdit={(productId) => {
          dispatch(openProductEditor({ mode: 'edit', productId }));
        }}
        onOpenBatches={openBatches}
      />
      {detailProductId ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <FloorStockDetail
            productName={detailRow?.name ?? null}
            productSku={detailRow?.sku ?? null}
            batches={batches}
            loading={detailLoading}
          />
          <FloorStockMovements movements={movements} loading={detailLoading} />
        </div>
      ) : null}
      {activeBranchId ? (
        <StockReceiveDialog
          open={receiveOpen}
          onOpenChange={setReceiveOpen}
          onReceived={() => {
            void dispatch(refreshInventoryAfterMutation()).then(() => onStatusChange('success'));
          }}
        />
      ) : null}
    </div>
  );
}
