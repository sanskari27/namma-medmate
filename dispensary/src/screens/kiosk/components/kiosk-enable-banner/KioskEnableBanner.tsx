import { MonitorSmartphone, Play } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { KIOSK_CONTENT } from '../../KioskScreen.content';
import {
  selectKioskBusy,
  selectKioskOpen,
} from '../../store/kiosk.selectors';
import {
  closeSession,
  openSession,
  setCustomerMode,
} from '../../store';

export function KioskEnableBanner() {
  const dispatch = useDispatch<AppDispatch>();
  const open = useSelector(selectKioskOpen);
  const busy = useSelector(selectKioskBusy);

  return (
    <div className="ko-banner" data-off={!open}>
      <div className="ko-banner-ico" aria-hidden>
        <MonitorSmartphone size={20} />
      </div>
      <div className="ko-banner-copy">
        <h3>{open ? KIOSK_CONTENT.enabledTitle : KIOSK_CONTENT.disabledTitle}</h3>
        <p>{open ? KIOSK_CONTENT.enabledBody : KIOSK_CONTENT.disabledBody}</p>
      </div>
      <div className="ko-banner-actions">
        {open ? (
          <button
            type="button"
            className="ko-btn ko-btn-preview"
            disabled={busy}
            onClick={() => dispatch(setCustomerMode(true))}
          >
            <Play size={14} aria-hidden />
            {KIOSK_CONTENT.launchPreview}
          </button>
        ) : null}
        <button
          type="button"
          className="ko-switch"
          data-on={open}
          aria-label="Toggle kiosk"
          disabled={busy}
          onClick={() => {
            void dispatch(open ? closeSession() : openSession());
          }}
        />
      </div>
    </div>
  );
}
