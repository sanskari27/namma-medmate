import { useId, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { TRENDS_CONTENT } from '../../TrendsScreen.content';
import type { CompareKind, OutletScope } from '../../TrendsScreen.utils';
import {
  compareChanged,
  loadTrends,
  scopeChanged,
  selectTrendsBusy,
  selectTrendsCompare,
  selectTrendsScope,
} from '../../store';

export function TrendsFilterBar({ owner }: { owner: boolean }) {
  const dispatch = useDispatch<AppDispatch>();
  const compare = useSelector(selectTrendsCompare);
  const scope = useSelector(selectTrendsScope);
  const busy = useSelector(selectTrendsBusy);
  const applyRef = useRef<HTMLButtonElement | null>(null);
  const formId = useId();

  return (
    <form
      className="tr-toolbar"
      aria-label={TRENDS_CONTENT.windowLabel}
      id={formId}
      onSubmit={(event) => {
        event.preventDefault();
        void dispatch(loadTrends()).then(() => {
          queueMicrotask(() => applyRef.current?.focus());
        });
      }}
    >
      <div className="tr-seg" role="group" aria-label="Window">
        <button
          type="button"
          className={compare === 'WOW' ? 'on' : undefined}
          disabled={busy}
          onClick={() => {
            dispatch(compareChanged('WOW' satisfies CompareKind));
            void dispatch(loadTrends());
          }}
        >
          {TRENDS_CONTENT.wow}
        </button>
        <button
          type="button"
          className={compare === 'MOM' ? 'on' : undefined}
          disabled={busy}
          onClick={() => {
            dispatch(compareChanged('MOM' satisfies CompareKind));
            void dispatch(loadTrends());
          }}
        >
          {TRENDS_CONTENT.mom}
        </button>
      </div>
      {owner ? (
        <select
          className="tr-select"
          aria-label={TRENDS_CONTENT.outlet}
          value={scope}
          disabled={busy}
          onChange={(event) =>
            dispatch(scopeChanged(event.target.value as OutletScope))
          }
        >
          <option value="session">{TRENDS_CONTENT.thisOutlet}</option>
          <option value="tenant">{TRENDS_CONTENT.allOutlets}</option>
        </select>
      ) : null}
      <button ref={applyRef} className="tr-btn" type="submit" disabled={busy}>
        {TRENDS_CONTENT.apply}
      </button>
    </form>
  );
}
