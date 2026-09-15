import { X } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { KIOSK_CONTENT } from '../../KioskScreen.content';
import {
  selectKioskConfigDraft,
  selectKioskOrderSuccess,
  selectKioskPinInput,
  selectKioskPinPromptOpen,
  selectKioskStatusHint,
} from '../../store/kiosk.selectors';
import {
  closePinPrompt,
  closeSession,
  openPinPrompt,
  setPinInput,
  verifyExitPin,
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
  const pinHint = useSelector(selectKioskStatusHint);

  function tryExit() {
    dispatch(openPinPrompt());
  }

  function confirmPin() {
    void dispatch(verifyExitPin(pinInput));
  }

  function closeKioskFully() {
    void dispatch(verifyExitPin(pinInput)).then((result) => {
      if (verifyExitPin.fulfilled.match(result)) {
        void dispatch(closeSession());
      }
    });
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
              {pinHint ? (
                <p className="ko-hint" style={{ color: '#dc2626' }}>
                  {pinHint}
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
