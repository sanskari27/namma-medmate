import { Banknote, Plus, Search, WalletCards } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { RETURNS_CONTENT } from '../../ReturnsScreen.content';
import type { ReturnsFilter } from '../../ReturnsScreen.utils';
import { openCreateReturn, setReturnsFilter, setReturnsQuery } from '../../store/returns.slice';
import {
  selectReturnsFilter,
  selectReturnsFilterCounts,
  selectReturnsQuery,
} from '../../store/returns.selectors';

const FILTERS: {
  id: ReturnsFilter;
  label: string;
  icon?: typeof Banknote;
}[] = [
  { id: 'all', label: RETURNS_CONTENT.filters.all },
  { id: 'cash', label: RETURNS_CONTENT.filters.cash, icon: Banknote },
  { id: 'credit', label: RETURNS_CONTENT.filters.credit, icon: WalletCards },
];

export function ReturnsToolbar() {
  const dispatch = useDispatch<AppDispatch>();
  const filter = useSelector(selectReturnsFilter);
  const query = useSelector(selectReturnsQuery);
  const counts = useSelector(selectReturnsFilterCounts);

  return (
    <div className="returns-toolbar">
      <div className="returns-seg" role="tablist" aria-label="Return filters">
        {FILTERS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={filter === item.id}
              data-on={filter === item.id}
              onClick={() => dispatch(setReturnsFilter(item.id))}
            >
              {Icon ? <Icon size={13} strokeWidth={1.8} aria-hidden /> : null}
              {item.label} ({counts[item.id]})
            </button>
          );
        })}
      </div>
      <label className="returns-search">
        <Search size={16} strokeWidth={1.8} aria-hidden />
        <input
          type="search"
          value={query}
          placeholder={RETURNS_CONTENT.searchPlaceholder}
          aria-label={RETURNS_CONTENT.searchPlaceholder}
          onChange={(event) => dispatch(setReturnsQuery(event.target.value))}
        />
      </label>
      <button
        type="button"
        className="returns-btn returns-btn-primary"
        onClick={() => dispatch(openCreateReturn())}
      >
        <Plus size={15} strokeWidth={2.2} aria-hidden />
        {RETURNS_CONTENT.newReturn}
      </button>
    </div>
  );
}
