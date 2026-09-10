import type { AppDispatch, RootState } from '@/store';
import { useCallback, useId } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AdjustmentWorkspace } from './components/adjustment-workspace/AdjustmentWorkspace';
import { CatalogueWorkspace } from './components/catalogue-workspace/CatalogueWorkspace';
import { ControlledStockWorkspace } from './components/controlled-stock-workspace/ControlledStockWorkspace';
import { FloorStockWorkspace } from './components/floor-stock-workspace/FloorStockWorkspace';
import { GuidanceWorkspace } from './components/guidance-workspace/GuidanceWorkspace';
import { InventoryHeader } from './components/inventory-header/InventoryHeader';
import { InventoryStatusBanner } from './components/inventory-status-banner';
import { ProductEditorDialog } from './components/product-editor-dialog';
import { QualityCheckWorkspace } from './components/quality-check-workspace';
import { PurchaseReturnWorkspace } from './components/purchase-return-workspace';
import { StockTakeWorkspace } from './components/stock-take-workspace/StockTakeWorkspace';
import { TransferWorkspace } from './components/transfer-workspace/TransferWorkspace';
import { hasInventoryAccess, type PageStatus } from './InventoryScreen.utils';
import {
  openTransfer,
  selectAdjustOpen,
  selectInventoryStatus,
  selectInventoryView,
  selectReturnOpen,
  selectStockTakeOpen,
  selectTransferOpen,
  selectTransferPrefillProductId,
  setAdjustOpen,
  setInventoryView,
  setReturnOpen,
  setStockTakeOpen,
  setTransferOpen,
  setWorkspaceStatus,
} from './store';

export default function InventoryScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const allowed = hasInventoryAccess(user?.modules);
  const activeBranchId = user?.activeBranchId ?? null;
  const branches = user?.branches ?? [];
  const statusId = useId();

  const view = useSelector(selectInventoryView);
  const status = useSelector(selectInventoryStatus);
  const transferOpen = useSelector(selectTransferOpen);
  const adjustOpen = useSelector(selectAdjustOpen);
  const stockTakeOpen = useSelector(selectStockTakeOpen);
  const returnOpen = useSelector(selectReturnOpen);
  const transferPrefillProductId = useSelector(selectTransferPrefillProductId);

  const onStatusChange = useCallback(
    (next: PageStatus) => {
      dispatch(setWorkspaceStatus({ status: next }));
    },
    [dispatch],
  );

  const denied = !allowed || status === 'denied';
  const showBanner = view !== 'floor' && status !== null;
  const noopRef = { current: null };

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 bg-canvas">
      <InventoryHeader
        view={view}
        onViewChange={(next) => dispatch(setInventoryView(next))}
        denied={denied}
      />
      {showBanner ? (
        <InventoryStatusBanner
          status={status}
          statusId={statusId}
          asAlert={status === 'denied'}
          view={view}
        />
      ) : null}
      {!denied && view === 'floor' ? (
        <FloorStockWorkspace
          allowed={allowed}
          activeBranchId={activeBranchId}
          onStatusChange={onStatusChange}
        />
      ) : null}
      {!denied && view === 'catalogue' ? (
        <CatalogueWorkspace allowed={allowed} onStatusChange={onStatusChange} />
      ) : null}
      {!denied && view === 'transfers' ? (
        <TransferWorkspace
          allowed={allowed}
          activeBranchId={activeBranchId}
          branches={branches}
          transferButtonRef={noopRef}
          createOpen={transferOpen}
          onCreateOpenChange={(open) => dispatch(setTransferOpen(open))}
          onStatusChange={onStatusChange}
          prefillProductId={transferPrefillProductId}
        />
      ) : null}
      {!denied && view === 'adjustments' ? (
        <AdjustmentWorkspace
          allowed={allowed}
          activeBranchId={activeBranchId}
          adjustButtonRef={noopRef}
          createOpen={adjustOpen}
          onCreateOpenChange={(open) => dispatch(setAdjustOpen(open))}
          onStatusChange={onStatusChange}
        />
      ) : null}
      {!denied && view === 'guidance' ? (
        <GuidanceWorkspace
          allowed={allowed}
          onStatusChange={onStatusChange}
          onStartTransfer={(productId) => dispatch(openTransfer({ productId }))}
        />
      ) : null}
      {!denied && view === 'stocktake' ? (
        <StockTakeWorkspace
          allowed={allowed}
          activeBranchId={activeBranchId}
          startOpen={stockTakeOpen}
          onStartOpenChange={(open) => dispatch(setStockTakeOpen(open))}
          startButtonRef={noopRef}
          onStatusChange={onStatusChange}
        />
      ) : null}
      {!denied && view === 'controlled' ? (
        <ControlledStockWorkspace
          allowed={allowed}
          activeBranchId={activeBranchId}
          onStatusChange={onStatusChange}
        />
      ) : null}
      {!denied && view === 'qc' ? (
        <QualityCheckWorkspace
          allowed={allowed}
          activeBranchId={activeBranchId}
          onStatusChange={onStatusChange}
        />
      ) : null}
      {!denied && view === 'returns' ? (
        <PurchaseReturnWorkspace
          allowed={allowed}
          activeBranchId={activeBranchId}
          createOpen={returnOpen}
          onCreateOpenChange={(open) => dispatch(setReturnOpen(open))}
          createButtonRef={noopRef}
          onStatusChange={onStatusChange}
        />
      ) : null}
      <ProductEditorDialog />
    </div>
  );
}
