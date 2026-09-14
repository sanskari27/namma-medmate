import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store';
import { KioskConfigPanel } from './components/kiosk-config-panel';
import { KioskCustomerShell } from './components/kiosk-customer-shell';
import { KioskEnableBanner } from './components/kiosk-enable-banner';
import { KioskStatusBanner } from './components/kiosk-status-banner';
import { KioskWaitingQueue } from './components/kiosk-waiting-queue';
import { KIOSK_CONTENT } from './KioskScreen.content';
import './KioskScreen.css';
import { hasKioskAccess } from './KioskScreen.utils';
import {
  loadKiosk,
  selectKioskConfigDraft,
  selectKioskCustomerMode,
  selectKioskStatus,
} from './store';

export default function KioskScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const status = useSelector(selectKioskStatus);
  const customerMode = useSelector(selectKioskCustomerMode);
  const config = useSelector(selectKioskConfigDraft);
  const allowed = hasKioskAccess(user?.modules);

  useEffect(() => {
    if (!allowed) return;
    void dispatch(loadKiosk());
  }, [dispatch, allowed, user?.activeBranchId]);

  if (!allowed) {
    return (
      <div className="ko" aria-label={KIOSK_CONTENT.regionLabel}>
        <div className="ko-alert" data-tone="alert" role="alert">
          <strong>{KIOSK_CONTENT.denied}</strong>
        </div>
      </div>
    );
  }

  return (
    <div
      className="ko"
      data-theme={config.accentTheme}
      aria-label={KIOSK_CONTENT.regionLabel}
    >
      <KioskStatusBanner />

      {status === 'loading' || status === 'idle' ? (
        <div className="ko-loading" role="status">
          {KIOSK_CONTENT.status.loading}
        </div>
      ) : status === 'denied' ? (
        <div className="ko-alert" data-tone="alert" role="alert">
          <strong>{KIOSK_CONTENT.denied}</strong>
        </div>
      ) : (
        <>
          <KioskEnableBanner />
          <KioskConfigPanel />
          <KioskWaitingQueue />
        </>
      )}

      {customerMode ? <KioskCustomerShell /> : null}
    </div>
  );
}
