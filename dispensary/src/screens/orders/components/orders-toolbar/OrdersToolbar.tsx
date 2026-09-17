import { Search, Store, Zap, Wallet } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { ORDERS_CONTENT } from '../../OrdersScreen.content';
import { ORDER_FILTER_TABS, type OrdersFilter } from '../../OrdersScreen.utils';
import { setOrdersFilter, setOrdersQuery } from '../../store/orders.slice';
import {
  selectOrdersFilter,
  selectOrdersFilterCounts,
  selectOrdersQuery,
} from '../../store/orders.selectors';

const FILTER_ICONS: Partial<Record<OrdersFilter, typeof Store>> = {
  counter: Store,
  needsAction: Zap,
  unpaid: Wallet,
};

export function OrdersToolbar() {
  const dispatch = useDispatch<AppDispatch>();
  const filter = useSelector(selectOrdersFilter);
  const query = useSelector(selectOrdersQuery);
  const counts = useSelector(selectOrdersFilterCounts);

  return (
    <div className="orders-toolbar">
      <div className="orders-seg" role="tablist" aria-label="Order filters">
        {ORDER_FILTER_TABS.map((id) => {
          const Icon = FILTER_ICONS[id];
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={filter === id}
              data-on={filter === id}
              onClick={() => dispatch(setOrdersFilter(id))}
            >
              {Icon ? <Icon size={13} strokeWidth={1.8} aria-hidden /> : null}
              {ORDERS_CONTENT.filters[id]} ({counts[id]})
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
