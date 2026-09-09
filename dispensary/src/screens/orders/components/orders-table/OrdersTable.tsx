import { useSelector } from 'react-redux';
import { ORDERS_CONTENT } from '../../OrdersScreen.content';
import { selectFilteredOrders } from '../../store/orders.selectors';
import { OrdersRow } from '../orders-row';

export function OrdersTable() {
  const rows = useSelector(selectFilteredOrders);

  if (rows.length === 0) {
    return (
      <div className="orders-card">
        <div className="orders-empty">
          <strong>{ORDERS_CONTENT.emptyTitle}</strong>
          {ORDERS_CONTENT.emptyBody}
        </div>
      </div>
    );
  }

  return (
    <div className="orders-card">
      <div className="orders-tbl-wrap">
        <table className="orders-tbl">
          <thead>
            <tr>
              <th>{ORDERS_CONTENT.columns.invoice}</th>
              <th>{ORDERS_CONTENT.columns.customer}</th>
              <th>{ORDERS_CONTENT.columns.items}</th>
              <th>{ORDERS_CONTENT.columns.channel}</th>
              <th>{ORDERS_CONTENT.columns.payment}</th>
              <th>{ORDERS_CONTENT.columns.status}</th>
              <th className="num">{ORDERS_CONTENT.columns.amount}</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <OrdersRow key={row.id} row={row} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
