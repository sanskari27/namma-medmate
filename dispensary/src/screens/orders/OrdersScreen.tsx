import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store';
import { OrdersDetailDialog } from './components/orders-detail-dialog';
import { OrdersStatusBanner } from './components/orders-status-banner';
import { OrdersTable } from './components/orders-table';
import { OrdersToolbar } from './components/orders-toolbar';
import { ORDERS_CONTENT } from './OrdersScreen.content';
import './OrdersScreen.css';
import { selectOrdersStatus } from './store/orders.selectors';
import { loadOrders } from './store/orders.thunks';

export default function OrdersScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const status = useSelector(selectOrdersStatus);
  const activeBranchId = useSelector((state: RootState) => state.auth.user?.activeBranchId ?? null);

  useEffect(() => {
    void dispatch(loadOrders());
  }, [dispatch, activeBranchId]);

  if (status === 'denied' || status === 'no_branch') {
    return (
      <div className="orders" aria-label={ORDERS_CONTENT.regionLabel}>
        <OrdersStatusBanner />
      </div>
    );
  }

  return (
    <div className="orders" aria-label={ORDERS_CONTENT.regionLabel}>
      <OrdersStatusBanner />
      {status === 'loading' || status === 'idle' ? (
        <div className="orders-card">
          <div className="orders-loading" role="status">
            Loading orders…
          </div>
        </div>
      ) : (
        <>
          <OrdersToolbar />
          <OrdersTable />
        </>
      )}
      <OrdersDetailDialog />
    </div>
  );
}
