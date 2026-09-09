import { Search, Store, Globe, Zap, Wallet } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { ORDERS_CONTENT } from '../../OrdersScreen.content';
import type { OrdersFilter } from '../../OrdersScreen.utils';
import { setOrdersFilter, setOrdersQuery } from '../../store/orders.slice';
import {
  selectOrdersFilter,
  selectOrdersFilterCounts,
  selectOrdersQuery,
} from '../../store/orders.selectors';

const FILTERS: {
  id: OrdersFilter;
  label: string;
  icon?: typeof Globe;
}[] = [
  { id: 'all', label: ORDERS_CONTENT.filters.all },
  { id: 'online', label: ORDERS_CONTENT.filters.online, icon: Globe },
  { id: 'counter', label: ORDERS_CONTENT.filters.counter, icon: Store },
  { id: 'needsAction', label: ORDERS_CONTENT.filters.needsAction, icon: Zap },
  { id: 'unpaid', label: ORDERS_CONTENT.filters.unpaid, icon: Wallet },
];

export function OrdersToolbar() {
  const dispatch = useDispatch<AppDispatch>();
  const filter = useSelector(selectOrdersFilter);
  const query = useSelector(selectOrdersQuery);
  const counts = useSelector(selectOrdersFilterCounts);

  return (
    <div className="orders-toolbar">
      <div className="orders-seg" role="tablist" aria-label="Order filters">
        {FILTERS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={filter === item.id}
              data-on={filter === item.id}
              onClick={() => dispatch(setOrdersFilter(item.id))}
            >
              {Icon ? <Icon size={13} strokeWidth={1.8} aria-hidden /> : null}
              {item.label} ({counts[item.id]})
            </button>
          );
        })}
      </div>
      <label className="orders-search">
        <Search size={16} strokeWidth={1.8} aria-hidden />
        <input
          type="search"
          value={query}
          placeholder={ORDERS_CONTENT.searchPlaceholder}
          aria-label={ORDERS_CONTENT.searchPlaceholder}
          onChange={(event) => dispatch(setOrdersQuery(event.target.value))}
        />
      </label>
    </div>
  );
}
