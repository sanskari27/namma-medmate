import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store';
import { DistributorsComparePanel } from './components/distributors-compare-panel';
import { DistributorsDirectory } from './components/distributors-directory';
import { DistributorsDuesBanner } from './components/distributors-dues-banner';
import { DistributorsFormDialog } from './components/distributors-form-dialog';
import { DistributorsPaymentDialog } from './components/distributors-payment-dialog';
import { DistributorsStatusBanner } from './components/distributors-status-banner';
import { DistributorsSummary } from './components/distributors-summary';
import { DistributorsSupplyPanel } from './components/distributors-supply-panel';
import { DistributorsTabs } from './components/distributors-tabs';
import { DISTRIBUTORS_CONTENT } from './DistributorsScreen.content';
import './DistributorsScreen.css';
import { hasSupplierAccess } from './DistributorsScreen.utils';
import {
  selectDistributorsStatus,
  selectDistributorsTab,
} from './store/distributors.selectors';
import { loadDistributors } from './store/distributors.thunks';

export default function DistributorsScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const status = useSelector(selectDistributorsStatus);
  const tab = useSelector(selectDistributorsTab);
  const user = useSelector((state: RootState) => state.auth.user);
  const allowed = hasSupplierAccess(user?.modules);

  useEffect(() => {
    if (!allowed) return;
    void dispatch(loadDistributors());
  }, [dispatch, allowed]);

  if (!allowed) {
    return (
      <div className="dist" aria-label={DISTRIBUTORS_CONTENT.regionLabel}>
        <div className="dist-banner" data-tone="alert" role="alert">
          <strong>{DISTRIBUTORS_CONTENT.denied}</strong>
        </div>
      </div>
    );
  }

  if (status === 'denied') {
    return (
      <div className="dist" aria-label={DISTRIBUTORS_CONTENT.regionLabel}>
        <DistributorsStatusBanner />
      </div>
    );
  }

  return (
    <div className="dist" aria-label={DISTRIBUTORS_CONTENT.regionLabel}>
      <DistributorsStatusBanner />
      <DistributorsDuesBanner />
      <DistributorsTabs />

      {status === 'loading' || status === 'idle' ? (
        <div className="dist-card">
          <div className="dist-loading" role="status">
            {DISTRIBUTORS_CONTENT.status.loading}
          </div>
        </div>
      ) : (
        <>
          <DistributorsSummary />
          {tab === 'distributors' ? <DistributorsDirectory /> : null}
          {tab === 'supply' ? <DistributorsSupplyPanel /> : null}
          {tab === 'compare' ? <DistributorsComparePanel /> : null}
        </>
      )}

      <DistributorsFormDialog />
      <DistributorsPaymentDialog />
    </div>
  );
}
