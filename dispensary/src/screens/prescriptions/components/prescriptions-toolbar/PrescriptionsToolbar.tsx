import { Archive, Search } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { RX_CONTENT } from '../../PrescriptionsScreen.content';
import type { RxFilter } from '../../PrescriptionsScreen.utils';
import {
  selectRxActionBusy,
  selectRxFilter,
  selectRxFilterCounts,
  selectRxQuery,
} from '../../store/prescriptions.selectors';
import { setRxFilter, setRxQuery } from '../../store/prescriptions.slice';
import { scanExpiredPrescriptions } from '../../store/prescriptions.thunks';

const FILTERS: { id: RxFilter; label: string }[] = [
  { id: 'active', label: RX_CONTENT.filters.active },
  { id: 'fulfilled', label: RX_CONTENT.filters.fulfilled },
  { id: 'expired', label: RX_CONTENT.filters.expired },
  { id: 'all', label: RX_CONTENT.filters.all },
];

export function PrescriptionsToolbar() {
  const dispatch = useDispatch<AppDispatch>();
  const filter = useSelector(selectRxFilter);
  const query = useSelector(selectRxQuery);
  const counts = useSelector(selectRxFilterCounts);
  const busy = useSelector(selectRxActionBusy);

  return (
    <div className="rx-toolbar">
      <div className="rx-seg" role="tablist" aria-label="Rx status filter">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            data-on={filter === item.id ? 'true' : 'false'}
            aria-selected={filter === item.id}
            onClick={() => dispatch(setRxFilter(item.id))}
          >
            {item.label}
            {item.id !== 'all' ? ` (${counts[item.id]})` : ''}
          </button>
        ))}
      </div>

      <label className="rx-search">
        <Search size={15} strokeWidth={1.8} aria-hidden />
        <input
          value={query}
          placeholder={RX_CONTENT.searchPlaceholder}
          aria-label={RX_CONTENT.searchPlaceholder}
          onChange={(event) => dispatch(setRxQuery(event.target.value))}
        />
      </label>

      <button
        type="button"
        className="rx-btn rx-btn-primary"
        disabled={busy}
        onClick={() => void dispatch(scanExpiredPrescriptions())}
      >
        <Archive size={14} strokeWidth={1.8} aria-hidden />
        {RX_CONTENT.scanExpired}
      </button>
    </div>
  );
}
