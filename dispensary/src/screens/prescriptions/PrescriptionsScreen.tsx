import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store';
import { PrescriptionsDetailDialog } from './components/prescriptions-detail-dialog';
import { PrescriptionsGrid } from './components/prescriptions-grid';
import { PrescriptionsInsights } from './components/prescriptions-insights';
import { PrescriptionsStatusBanner } from './components/prescriptions-status-banner';
import { PrescriptionsSummary } from './components/prescriptions-summary';
import { PrescriptionsToolbar } from './components/prescriptions-toolbar';
import { RX_CONTENT } from './PrescriptionsScreen.content';
import './PrescriptionsScreen.css';
import { canViewRxFile } from './PrescriptionsScreen.utils';
import { selectRxStatus } from './store/prescriptions.selectors';
import { loadPrescriptions } from './store/prescriptions.thunks';

export default function PrescriptionsScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const status = useSelector(selectRxStatus);
  const user = useSelector((state: RootState) => state.auth.user);
  const activeBranchId = user?.activeBranchId ?? null;
  const allowed = canViewRxFile(user?.role, user?.roles);

  useEffect(() => {
    if (!allowed || !activeBranchId) return;
    void dispatch(loadPrescriptions());
  }, [dispatch, activeBranchId, allowed]);

  if (!allowed) {
    return (
      <div className="rx" aria-label={RX_CONTENT.regionLabel}>
        <div className="rx-banner" data-tone="alert" role="alert">
          <strong>{RX_CONTENT.denied}</strong>
        </div>
      </div>
    );
  }

  if (!activeBranchId) {
    return (
      <div className="rx" aria-label={RX_CONTENT.regionLabel}>
        <div className="rx-banner" data-tone="alert" role="alert">
          <strong>{RX_CONTENT.noBranch}</strong>
        </div>
      </div>
    );
  }

  if (status === 'denied' || status === 'no_branch') {
    return (
      <div className="rx" aria-label={RX_CONTENT.regionLabel}>
        <PrescriptionsStatusBanner />
      </div>
    );
  }

  return (
    <div className="rx" aria-label={RX_CONTENT.regionLabel}>
      <PrescriptionsStatusBanner />
      {status === 'loading' || status === 'idle' ? (
        <div className="rx-card">
          <div className="rx-loading" role="status">
            {RX_CONTENT.status.loading}
          </div>
        </div>
      ) : (
        <>
          <PrescriptionsSummary />
          <PrescriptionsInsights />
          <PrescriptionsToolbar />
          <PrescriptionsGrid />
        </>
      )}
      <PrescriptionsDetailDialog />
    </div>
  );
}
