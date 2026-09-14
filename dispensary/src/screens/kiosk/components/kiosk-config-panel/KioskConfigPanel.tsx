import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import type { KioskAccentTheme } from '@/services/kiosk';
import { KIOSK_CONTENT } from '../../KioskScreen.content';
import {
  selectKioskBusy,
  selectKioskConfigBusy,
  selectKioskConfigDraft,
} from '../../store/kiosk.selectors';
import { patchConfigDraft, persistConfig, setAccentTheme } from '../../store';

const THEMES: KioskAccentTheme[] = ['green', 'dark', 'gold'];

export function KioskConfigPanel() {
  const dispatch = useDispatch<AppDispatch>();
  const draft = useSelector(selectKioskConfigDraft);
  const busy = useSelector(selectKioskBusy);
  const configBusy = useSelector(selectKioskConfigBusy);

  return (
    <section className="ko-card" aria-labelledby="ko-config-heading">
      <h3 id="ko-config-heading">{KIOSK_CONTENT.configTitle}</h3>

      <div className="ko-field">
        <label htmlFor="ko-display">{KIOSK_CONTENT.displayName}</label>
        <input
          id="ko-display"
          value={draft.displayName}
          onChange={(e) => dispatch(patchConfigDraft({ displayName: e.target.value }))}
        />
      </div>

      <div className="ko-field">
        <label htmlFor="ko-welcome">{KIOSK_CONTENT.welcome}</label>
        <input
          id="ko-welcome"
          value={draft.welcomeMessage}
          onChange={(e) => dispatch(patchConfigDraft({ welcomeMessage: e.target.value }))}
        />
      </div>

      <div className="ko-row-2">
        <div className="ko-field">
          <label htmlFor="ko-pin">{KIOSK_CONTENT.staffPin}</label>
          <input
            id="ko-pin"
            value={draft.staffExitPin}
            onChange={(e) => dispatch(patchConfigDraft({ staffExitPin: e.target.value }))}
            inputMode="numeric"
            autoComplete="off"
          />
        </div>
        <div className="ko-field">
          <label htmlFor="ko-idle">{KIOSK_CONTENT.idleReset}</label>
          <input
            id="ko-idle"
            type="number"
            min={15}
            max={600}
            value={draft.idleResetSeconds}
            onChange={(e) =>
              dispatch(patchConfigDraft({ idleResetSeconds: Number(e.target.value) || 60 }))
            }
          />
        </div>
      </div>

      <div className="ko-field">
        <label>{KIOSK_CONTENT.accentTheme}</label>
        <div className="ko-themes">
          {THEMES.map((theme) => (
            <button
              key={theme}
              type="button"
              className="ko-theme"
              data-on={draft.accentTheme === theme}
              onClick={() => dispatch(setAccentTheme(theme))}
            >
              {theme}
            </button>
          ))}
        </div>
      </div>

      <p className="ko-section-label">{KIOSK_CONTENT.customerOptions}</p>
      <div className="ko-toggle-row">
        <span>{KIOSK_CONTENT.showPrices}</span>
        <button
          type="button"
          className="ko-switch"
          data-on={draft.showPrices}
          aria-label={KIOSK_CONTENT.showPrices}
          onClick={() => dispatch(patchConfigDraft({ showPrices: !draft.showPrices }))}
        />
      </div>
      <div className="ko-toggle-row">
        <span>{KIOSK_CONTENT.allowRx}</span>
        <button
          type="button"
          className="ko-switch"
          data-on={draft.allowRxUpload}
          aria-label={KIOSK_CONTENT.allowRx}
          onClick={() => dispatch(patchConfigDraft({ allowRxUpload: !draft.allowRxUpload }))}
        />
      </div>

      <p className="ko-section-label">{KIOSK_CONTENT.payments}</p>
      <div className="ko-pay-grid">
        {(
          [
            ['acceptCash', KIOSK_CONTENT.cash],
            ['acceptUpi', KIOSK_CONTENT.upi],
            ['acceptCard', KIOSK_CONTENT.card],
            ['acceptCod', KIOSK_CONTENT.cod],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className="ko-pay"
            data-on={draft[key]}
            onClick={() => dispatch(patchConfigDraft({ [key]: !draft[key] }))}
          >
            {label}
          </button>
        ))}
      </div>

      <p className="ko-hint">{KIOSK_CONTENT.configHint}</p>

      <div style={{ marginTop: 16 }}>
        <button
          type="button"
          className="ko-btn ko-btn-primary"
          disabled={busy || configBusy}
          onClick={() => void dispatch(persistConfig(draft))}
        >
          {configBusy ? KIOSK_CONTENT.saving : KIOSK_CONTENT.saveConfig}
        </button>
      </div>
    </section>
  );
}
