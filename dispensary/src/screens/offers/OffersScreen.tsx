import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store';
import { OffersFormDialog } from './components/offers-form-dialog';
import { OffersGrid } from './components/offers-grid';
import { OffersStatusBanner } from './components/offers-status-banner';
import { OffersToolbar } from './components/offers-toolbar';
import { OFFERS_CONTENT } from './OffersScreen.content';
import './OffersScreen.css';
import { hasSalesAccess } from './OffersScreen.utils';
import { selectOffersStatus } from './store/offers.selectors';
import { loadOffers } from './store/offers.thunks';

export default function OffersScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const status = useSelector(selectOffersStatus);
  const user = useSelector((state: RootState) => state.auth.user);
  const allowed = hasSalesAccess(user?.modules);

  useEffect(() => {
    if (!allowed) return;
    void dispatch(loadOffers());
  }, [dispatch, allowed]);

  if (!allowed) {
    return (
      <div className="off" aria-label={OFFERS_CONTENT.regionLabel}>
        <div className="off-banner" data-tone="alert" role="alert">
          <strong>{OFFERS_CONTENT.denied}</strong>
        </div>
      </div>
    );
  }

  if (status === 'denied') {
    return (
      <div className="off" aria-label={OFFERS_CONTENT.regionLabel}>
        <OffersStatusBanner />
      </div>
    );
  }

  return (
    <div className="off" aria-label={OFFERS_CONTENT.regionLabel}>
      <OffersStatusBanner />
      <OffersToolbar />

      {status === 'loading' || status === 'idle' ? (
        <div className="off-loading" role="status">
          {OFFERS_CONTENT.status.loading}
        </div>
      ) : (
        <OffersGrid />
      )}

      <OffersFormDialog />
    </div>
  );
}
