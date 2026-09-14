import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store';
import { PurchasesDetailDialog } from './components/purchases-detail-dialog';
import { PurchasesEntryDialog } from './components/purchases-entry-dialog';
import { PurchasesStatusBanner } from './components/purchases-status-banner';
import { PurchasesSummary } from './components/purchases-summary';
import { PurchasesTable } from './components/purchases-table';
import { PurchasesTip } from './components/purchases-tip';
import { PURCHASES_CONTENT } from './PurchasesScreen.content';
import './PurchasesScreen.css';
import { hasPurchaseAccess } from './PurchasesScreen.utils';
import { selectCreateHint, selectPurchasesStatus } from './store/purchases.selectors';
import { loadPurchases } from './store/purchases.thunks';

export default function PurchasesScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const status = useSelector(selectPurchasesStatus);
  const createHint = useSelector(selectCreateHint);
  const user = useSelector((state: RootState) => state.auth.user);
  const activeBranchId = user?.activeBranchId ?? null;
  const allowed = hasPurchaseAccess(user?.modules);

  useEffect(() => {
    if (!allowed || !activeBranchId) return;
    void dispatch(loadPurchases());
  }, [dispatch, activeBranchId, allowed]);

  if (!allowed) {
    return (
      <div className="purchases" aria-label={PURCHASES_CONTENT.regionLabel}>
        <div className="purchases-banner" data-tone="alert" role="alert">
          <strong>{PURCHASES_CONTENT.denied}</strong>
        </div>
      </div>
    );
  }

  if (!activeBranchId) {
    return (
      <div className="purchases" aria-label={PURCHASES_CONTENT.regionLabel}>
        <div className="purchases-banner" data-tone="alert" role="alert">
          <strong>{PURCHASES_CONTENT.noBranch}</strong>
        </div>
      </div>
    );
  }

  if (status === 'denied' || status === 'no_branch') {
    return (
      <div className="purchases" aria-label={PURCHASES_CONTENT.regionLabel}>
        <PurchasesStatusBanner />
      </div>
    );
  }

  return (
    <div className="purchases" aria-label={PURCHASES_CONTENT.regionLabel}>
      <PurchasesStatusBanner />
      {createHint && status !== 'loading' && status !== 'failure' ? (
        <div className="purchases-banner" data-tone="ok" role="status">
          {createHint}
        </div>
      ) : null}

      {status === 'loading' || status === 'idle' ? (
        <div className="purchases-card">
          <div className="purchases-loading" role="status">
            {PURCHASES_CONTENT.status.loading}
          </div>
        </div>
      ) : (
        <>
          <PurchasesSummary />
          <PurchasesTable />
          <PurchasesTip />
        </>
      )}

      <PurchasesEntryDialog />
      <PurchasesDetailDialog />
    </div>
  );
}
