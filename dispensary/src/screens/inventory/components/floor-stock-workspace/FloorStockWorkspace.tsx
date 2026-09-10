import type { AppDispatch } from '@/store';
import { ROUTES } from '@/libs/constants/routes.const';
import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { INVENTORY_CONTENT } from '../../InventoryScreen.content';
import { downloadInventoryCsv } from '../../InventoryScreen.format';
import type { PageStatus } from '../../InventoryScreen.utils';
import {
  loadInventoryOverview,
  openProductEditor,
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
import { InventoryFilterTabs } from '../inventory-filter-tabs';
import { InventoryKpiCards } from '../inventory-kpi-cards';
import { InventoryStockTable } from '../inventory-stock-table';
import { InventoryToolbar } from '../inventory-toolbar';

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
  const navigate = useNavigate();
  const summary = useSelector(selectInventorySummary);
  const rows = useSelector(selectFilteredInventoryRows);
  const filter = useSelector(selectInventoryFilter);
  const query = useSelector(selectInventoryQuery);
  const status = useSelector(selectInventoryStatus);
  const statusHint = useSelector(selectInventoryStatusHint);
  const flagBusyId = useSelector(selectInventoryFlagBusyId);
  const syncEpoch = useSelector(selectInventorySyncEpoch);

  const reload = useCallback(() => {
    if (!allowed) {
      onStatusChange('denied');
      return;
    }
    if (!activeBranchId) {
      onStatusChange('failure');
      return;
    }
    void dispatch(loadInventoryOverview());
  }, [allowed, activeBranchId, dispatch, onStatusChange]);

  useEffect(() => {
    reload();
  }, [reload, syncEpoch]);

  useEffect(() => {
    onStatusChange(status);
  }, [status, onStatusChange]);

  const emptyMessage =
    status === 'empty'
      ? INVENTORY_CONTENT.empty
      : filter !== 'all' || query.trim()
        ? INVENTORY_CONTENT.emptyFilter
        : INVENTORY_CONTENT.empty;

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
        onAddStock={() => navigate(ROUTES.PURCHASES)}
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
      />
    </div>
  );
}
