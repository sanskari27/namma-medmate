import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store';
import { ReturnsCreateDialog } from './components/returns-create-dialog';
import { ReturnsDetailDialog } from './components/returns-detail-dialog';
import { ReturnsStatusBanner } from './components/returns-status-banner';
import { ReturnsSummary } from './components/returns-summary';
import { ReturnsTable } from './components/returns-table';
import { ReturnsToolbar } from './components/returns-toolbar';
import { RETURNS_CONTENT } from './ReturnsScreen.content';
import './ReturnsScreen.css';
import { selectReturnsStatus } from './store/returns.selectors';
import { loadReturns } from './store/returns.thunks';

export default function ReturnsScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const status = useSelector(selectReturnsStatus);
  const user = useSelector((state: RootState) => state.auth.user);
  const activeBranchId = user?.activeBranchId ?? null;
  const allowed = Boolean(user?.modules?.includes('SALES'));

  useEffect(() => {
    if (!allowed || !activeBranchId) return;
    void dispatch(loadReturns());
  }, [dispatch, activeBranchId, allowed]);

  if (!allowed) {
    return (
      <div className="returns" aria-label={RETURNS_CONTENT.regionLabel}>
        <div className="returns-banner" data-tone="alert" role="alert">
          <strong>{RETURNS_CONTENT.denied}</strong>
        </div>
      </div>
    );
  }

  if (!activeBranchId) {
    return (
      <div className="returns" aria-label={RETURNS_CONTENT.regionLabel}>
        <div className="returns-banner" data-tone="alert" role="alert">
          <strong>{RETURNS_CONTENT.noBranch}</strong>
        </div>
      </div>
    );
  }

  if (status === 'denied' || status === 'no_branch') {
    return (
      <div className="returns" aria-label={RETURNS_CONTENT.regionLabel}>
        <ReturnsStatusBanner />
      </div>
    );
  }

  return (
    <div className="returns" aria-label={RETURNS_CONTENT.regionLabel}>
      <ReturnsStatusBanner />
      {status === 'loading' || status === 'idle' ? (
        <div className="returns-card">
          <div className="returns-loading" role="status">
            {RETURNS_CONTENT.status.loading}
          </div>
        </div>
      ) : (
        <>
          <ReturnsToolbar />
          <ReturnsSummary />
          <ReturnsTable />
        </>
      )}
      <ReturnsDetailDialog />
      <ReturnsCreateDialog />
    </div>
  );
}
