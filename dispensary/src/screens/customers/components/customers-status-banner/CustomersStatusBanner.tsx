import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { CUSTOMERS_CONTENT } from '../../CustomersScreen.content';
import {
  selectCustomersActionStatus,
  selectCustomersStatus,
  selectCustomersStatusHint,
} from '../../store/customers.selectors';
import { clearCustomerAction } from '../../store/customers.slice';
import { loadCustomers } from '../../store/customers.thunks';

export function CustomersStatusBanner() {
  const dispatch = useDispatch<AppDispatch>();
  const status = useSelector(selectCustomersStatus);
  const hint = useSelector(selectCustomersStatusHint);
  const actionStatus = useSelector(selectCustomersActionStatus);

  if (status === 'denied') {
    return (
      <div className="cust-banner" data-tone="alert" role="alert">
        <strong>{CUSTOMERS_CONTENT.denied}</strong>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="cust-banner" data-tone="alert" role="alert">
        {hint ?? CUSTOMERS_CONTENT.loadFailed}{' '}
        <button
          type="button"
          className="cust-btn cust-btn-ghost"
          onClick={() => void dispatch(loadCustomers())}
        >
          {CUSTOMERS_CONTENT.retry}
        </button>
      </div>
    );
  }

  if (actionStatus === 'success') {
    return (
      <div className="cust-banner" data-tone="ok" role="status">
        {CUSTOMERS_CONTENT.status.success}
        <button
          type="button"
          className="cust-btn cust-btn-ghost"
          style={{ marginLeft: 8 }}
          onClick={() => dispatch(clearCustomerAction())}
        >
          Dismiss
        </button>
      </div>
    );
  }

  if (actionStatus === 'settled') {
    return (
      <div className="cust-banner" data-tone="ok" role="status">
        {CUSTOMERS_CONTENT.status.settled}
      </div>
    );
  }

  if (actionStatus === 'failure') {
    return (
      <div className="cust-banner" data-tone="alert" role="alert">
        {CUSTOMERS_CONTENT.status.failure}
      </div>
    );
  }

  return null;
}
