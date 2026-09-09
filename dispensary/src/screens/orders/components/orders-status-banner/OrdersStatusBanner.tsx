import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { ORDERS_CONTENT } from '../../OrdersScreen.content';
import { loadOrders } from '../../store/orders.thunks';
import {
  selectOrdersActionHint,
  selectOrdersStatus,
  selectOrdersStatusHint,
} from '../../store/orders.selectors';
import { clearOrdersActionHint } from '../../store/orders.slice';

export function OrdersStatusBanner() {
  const dispatch = useDispatch<AppDispatch>();
  const status = useSelector(selectOrdersStatus);
  const hint = useSelector(selectOrdersStatusHint);
  const actionHint = useSelector(selectOrdersActionHint);

  if (status === 'denied') {
    return (
      <div className="orders-banner" data-tone="alert" role="alert">
        {ORDERS_CONTENT.denied}
      </div>
    );
  }

  if (status === 'no_branch') {
    return (
      <div className="orders-banner" data-tone="alert" role="alert">
        {ORDERS_CONTENT.noBranch}
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="orders-banner" data-tone="alert" role="alert">
        {hint ?? ORDERS_CONTENT.loadFailed}{' '}
        <button type="button" className="orders-btn orders-btn-ghost" onClick={() => void dispatch(loadOrders())}>
          {ORDERS_CONTENT.retry}
        </button>
      </div>
    );
  }

  if (actionHint) {
    return (
      <div className="orders-banner" data-tone="ok" role="status">
        {actionHint}{' '}
        <button
          type="button"
          className="orders-btn orders-btn-ghost"
          onClick={() => dispatch(clearOrdersActionHint())}
        >
          {ORDERS_CONTENT.actions.close}
        </button>
      </div>
    );
  }

  return null;
}
