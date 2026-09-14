import { X } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { KIOSK_CONTENT } from '../../KioskScreen.content';
import {
  selectKioskConfigDraft,
  selectKioskOrderSuccess,
  selectKioskPinInput,
  selectKioskPinPromptOpen,
} from '../../store/kiosk.selectors';
import {
  closePinPrompt,
  closeSession,
  openPinPrompt,
  setCustomerMode,
  setPinInput,
} from '../../store';
import { KioskCartPanel } from '../kiosk-cart-panel';
import { KioskProductGrid } from '../kiosk-product-grid';
import { KioskSuccess } from '../kiosk-success';

export function KioskCustomerShell() {
  const dispatch = useDispatch<AppDispatch>();
  const config = useSelector(selectKioskConfigDraft);
  const success = useSelector(selectKioskOrderSuccess);
  const pinOpen = useSelector(selectKioskPinPromptOpen);
  const pinInput = useSelector(selectKioskPinInput);

  function tryExit() {
    dispatch(openPinPrompt());
  }

  function confirmPin() {
    if (pinInput === config.staffExitPin) {
      dispatch(setCustomerMode(false));
      dispatch(closePinPrompt());
      return;
    }
    // Wrong PIN — keep prompt open; staff can retry
  }

  function closeKioskFully() {
    if (pinInput === config.staffExitPin) {
      void dispatch(closeSession());
      return;
    }
  }

  return (
    <div className="ko-overlay" role="dialog" aria-modal="true" aria-label={config.displayName}>
      <div className="ko-shell" data-theme={config.accentTheme}>
        <header className="ko-shell-head">
          <div>
            <h2>{config.displayName}</h2>
            <p>{config.welcomeMessage}</p>
          </div>
          <button type="button" className="ko-x" aria-label="Staff exit" onClick={tryExit}>
            <X size={18} />
          </button>
        </header>

        {success ? (
          <KioskSuccess />
        ) : (
          <div className="ko-shell-body">
            <KioskProductGrid />
            <KioskCartPanel />
          </div>
        )}

        {pinOpen ? (
          <div className="ko-pin">
            <div className="ko-pin-card">
              <h3>{KIOSK_CONTENT.pinPrompt}</h3>
              <div className="ko-field">
                <input
                  type="password"
                  inputMode="numeric"
                  autoFocus
                  value={pinInput}
                  onChange={(e) => dispatch(setPinInput(e.target.value))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmPin();
                  }}
                />
              </div>
              {pinInput && pinInput !== config.staffExitPin ? (
                <p className="ko-hint" style={{ color: '#dc2626' }}>
                  {KIOSK_CONTENT.pinWrong}
                </p>
              ) : null}
              <div className="ko-pin-actions">
                <button
                  type="button"
                  className="ko-btn ko-btn-ghost"
                  onClick={() => dispatch(closePinPrompt())}
                >
                  Cancel
                </button>
                <button type="button" className="ko-btn ko-btn-ghost" onClick={closeKioskFully}>
                  Close kiosk
                </button>
                <button type="button" className="ko-btn ko-btn-primary" onClick={confirmPin}>
                  Staff view
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
