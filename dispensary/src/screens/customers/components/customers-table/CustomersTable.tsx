import { useSelector } from 'react-redux';
import { CUSTOMERS_CONTENT } from '../../CustomersScreen.content';
import { selectSortedCustomers } from '../../store/customers.selectors';
import { CustomersRow } from '../customers-row';

export function CustomersTable() {
  const rows = useSelector(selectSortedCustomers);

  if (rows.length === 0) {
    return (
      <div className="cust-card">
        <div className="cust-empty">
          <strong>{CUSTOMERS_CONTENT.emptyTitle}</strong>
          {CUSTOMERS_CONTENT.emptyBody}
        </div>
      </div>
    );
  }

  return (
    <div className="cust-card">
      <div className="cust-tbl-wrap">
        <table className="cust-tbl">
          <thead>
            <tr>
              <th>{CUSTOMERS_CONTENT.columns.customer}</th>
              <th>{CUSTOMERS_CONTENT.columns.phone}</th>
              <th className="num">{CUSTOMERS_CONTENT.columns.orders}</th>
              <th>{CUSTOMERS_CONTENT.columns.channel}</th>
              <th className="num">{CUSTOMERS_CONTENT.columns.units}</th>
              <th>{CUSTOMERS_CONTENT.columns.lastVisit}</th>
              <th>{CUSTOMERS_CONTENT.columns.loyalty}</th>
              <th className="num">{CUSTOMERS_CONTENT.columns.lifetime}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <CustomersRow key={row.walkInAggregate ? 'walk-in' : row.id} row={row} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
