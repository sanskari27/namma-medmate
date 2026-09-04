import type { RootState } from '@/store';
import { useCallback, useId, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { AdjustmentWorkspace } from './components/adjustment-workspace/AdjustmentWorkspace';
import { CatalogueWorkspace } from './components/catalogue-workspace/CatalogueWorkspace';
import { FloorStockWorkspace } from './components/floor-stock-workspace/FloorStockWorkspace';
import { GuidanceWorkspace } from './components/guidance-workspace/GuidanceWorkspace';
import {
  InventoryHeader,
  type InventoryViewMode,
} from './components/inventory-header/InventoryHeader';
import { InventoryStatusBanner } from './components/inventory-status-banner';
import { TransferWorkspace } from './components/transfer-workspace/TransferWorkspace';
import { hasInventoryAccess, type PageStatus } from './InventoryScreen.utils';

export default function InventoryScreen() {
  const user = useSelector((state: RootState) => state.auth.user);
  const allowed = hasInventoryAccess(user?.modules);
  const activeBranchId = user?.activeBranchId ?? null;
  const branches = user?.branches ?? [];
  const statusId = useId();
  const addRef = useRef<HTMLButtonElement | null>(null);
  const receiveRef = useRef<HTMLButtonElement | null>(null);
  const transferRef = useRef<HTMLButtonElement | null>(null);
  const adjustRef = useRef<HTMLButtonElement | null>(null);

  const [view, setView] = useState<InventoryViewMode>('floor');
  const [status, setStatus] = useState<PageStatus>(allowed ? 'loading' : 'denied');
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [transferPrefillProductId, setTransferPrefillProductId] = useState<string | null>(null);
  const [createRequest, setCreateRequest] = useState(0);

  const onStatusChange = useCallback((next: PageStatus) => {
    setStatus(next);
  }, []);

  const denied = !allowed || status === 'denied';
  const showBanner = status !== null;

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 bg-canvas">
      <InventoryHeader
        view={view}
        onViewChange={(next) => {
          setView(next);
          setReceiveOpen(false);
          setTransferOpen(false);
          setAdjustOpen(false);
          setTransferPrefillProductId(null);
          setStatus(allowed ? 'loading' : 'denied');
        }}
        addButtonRef={addRef}
        receiveButtonRef={receiveRef}
        transferButtonRef={transferRef}
        adjustButtonRef={adjustRef}
        denied={denied}
        onAdd={() => setCreateRequest((n) => n + 1)}
        onReceive={() => setReceiveOpen(true)}
        onTransfer={() => {
          setTransferPrefillProductId(null);
          setTransferOpen(true);
        }}
        onAdjust={() => setAdjustOpen(true)}
      />
      {showBanner ? (
        <InventoryStatusBanner
          status={status}
          statusId={statusId}
          asAlert={status === 'denied'}
          view={view}
        />
      ) : (
        <div className="min-h-[2.75rem]" aria-hidden />
      )}
      {!denied && view === 'floor' ? (
        <FloorStockWorkspace
          allowed={allowed}
          activeBranchId={activeBranchId}
          receiveButtonRef={receiveRef}
          receiveOpen={receiveOpen}
          onReceiveOpenChange={setReceiveOpen}
          onStatusChange={onStatusChange}
        />
      ) : null}
      {!denied && view === 'catalogue' ? (
        <CatalogueWorkspace
          allowed={allowed}
          addButtonRef={addRef}
          onStatusChange={onStatusChange}
          createRequest={createRequest}
        />
      ) : null}
      {!denied && view === 'transfers' ? (
        <TransferWorkspace
          allowed={allowed}
          activeBranchId={activeBranchId}
          branches={branches}
          transferButtonRef={transferRef}
          createOpen={transferOpen}
          onCreateOpenChange={(open) => {
            setTransferOpen(open);
            if (!open) {
              setTransferPrefillProductId(null);
            }
          }}
          onStatusChange={onStatusChange}
          prefillProductId={transferPrefillProductId}
        />
      ) : null}
      {!denied && view === 'adjustments' ? (
        <AdjustmentWorkspace
          allowed={allowed}
          activeBranchId={activeBranchId}
          adjustButtonRef={adjustRef}
          createOpen={adjustOpen}
          onCreateOpenChange={setAdjustOpen}
          onStatusChange={onStatusChange}
        />
      ) : null}
      {!denied && view === 'guidance' ? (
        <GuidanceWorkspace
          allowed={allowed}
          onStatusChange={onStatusChange}
          onStartTransfer={(productId) => {
            setTransferPrefillProductId(productId);
            setView('transfers');
            setStatus(allowed ? 'loading' : 'denied');
            setTransferOpen(true);
          }}
        />
      ) : null}
    </div>
  );
}
