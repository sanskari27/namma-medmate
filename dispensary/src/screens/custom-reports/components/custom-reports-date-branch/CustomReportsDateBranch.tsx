import { useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { CUSTOM_REPORTS_CONTENT } from '../../CustomReportsScreen.content';
import type { OutletScope } from '../../CustomReportsScreen.utils';
import {
  fromChanged,
  loadCustomReportPreview,
  scopeChanged,
  selectCrBusy,
  selectCrFrom,
  selectCrScope,
  selectCrTo,
  toChanged,
} from '../../store';

export function CustomReportsDateBranch({ owner }: { owner: boolean }) {
  const dispatch = useDispatch<AppDispatch>();
  const from = useSelector(selectCrFrom);
  const to = useSelector(selectCrTo);
  const scope = useSelector(selectCrScope);
  const busy = useSelector(selectCrBusy);
  const applyRef = useRef<HTMLButtonElement | null>(null);

  return (
    <form
      className="cr-builder-bar"
      aria-label="Dates and outlet"
      onSubmit={(event) => {
        event.preventDefault();
        void dispatch(loadCustomReportPreview()).then(() => {
          queueMicrotask(() => applyRef.current?.focus());
        });
      }}
    >
      <div className="cr-field">
        <label htmlFor="custom-report-from">{CUSTOM_REPORTS_CONTENT.from}</label>
        <input
          id="custom-report-from"
          type="date"
          value={from}
          disabled={busy}
          onChange={(event) => dispatch(fromChanged(event.target.value))}
        />
      </div>
      <div className="cr-field">
        <label htmlFor="custom-report-to">{CUSTOM_REPORTS_CONTENT.to}</label>
        <input
          id="custom-report-to"
          type="date"
          value={to}
          disabled={busy}
          onChange={(event) => dispatch(toChanged(event.target.value))}
        />
      </div>
      {owner ? (
        <div className="cr-field">
          <label htmlFor="custom-report-outlet">{CUSTOM_REPORTS_CONTENT.outlet}</label>
          <select
            id="custom-report-outlet"
            value={scope}
            disabled={busy}
            onChange={(event) => dispatch(scopeChanged(event.target.value as OutletScope))}
          >
            <option value="session">{CUSTOM_REPORTS_CONTENT.thisOutlet}</option>
            <option value="tenant">{CUSTOM_REPORTS_CONTENT.allOutlets}</option>
          </select>
        </div>
      ) : null}
      <button ref={applyRef} type="submit" className="cr-btn cr-btn-ghost" disabled={busy}>
        {CUSTOM_REPORTS_CONTENT.showRows}
      </button>
    </form>
  );
}
