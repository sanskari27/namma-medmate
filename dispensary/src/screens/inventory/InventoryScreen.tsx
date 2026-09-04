import type { RootState } from '@/store';
import { useCallback, useId, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { CatalogueWorkspace } from './components/catalogue-workspace/CatalogueWorkspace';
import { FloorStockWorkspace } from './components/floor-stock-workspace/FloorStockWorkspace';
import {
  InventoryHeader,
  type InventoryViewMode,
} from './components/inventory-header/InventoryHeader';
import { InventoryStatusBanner } from './components/inventory-status-banner';
import { hasInventoryAccess, type PageStatus } from './InventoryScreen.utils';

export default function InventoryScreen() {
  const user = useSelector((state: RootState) => state.auth.user);
  const allowed = hasInventoryAccess(user?.modules);
  const activeBranchId = user?.activeBranchId ?? null;
  const statusId = useId();
  const addRef = useRef<HTMLButtonElement | null>(null);
  const receiveRef = useRef<HTMLButtonElement | null>(null);

  const [view, setView] = useState<InventoryViewMode>('floor');
  const [status, setStatus] = useState<PageStatus>(allowed ? 'loading' : 'denied');
  const [receiveOpen, setReceiveOpen] = useState(false);
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
          setStatus(allowed ? 'loading' : 'denied');
        }}
        addButtonRef={addRef}
        receiveButtonRef={receiveRef}
        denied={denied}
        onAdd={() => setCreateRequest((n) => n + 1)}
        onReceive={() => setReceiveOpen(true)}
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
    </div>
  );
}
