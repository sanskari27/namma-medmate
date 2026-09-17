import { Globe, Store, UserRound } from 'lucide-react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '@/store';
import type { CustomerDirectoryItem } from '@/services/customers';
import { CUSTOMERS_CONTENT } from '../../CustomersScreen.content';
import {
  formatPaise,
  formatPhone,
  relativeTime,
  rowKey,
} from '../../CustomersScreen.utils';
import { openCustomerDetail } from '../../store/customers.slice';
import { loadCustomerDetail } from '../../store/customers.thunks';

type CustomersRowProps = {
  row: CustomerDirectoryItem;
};

export function CustomersRow({ row }: CustomersRowProps) {
  const dispatch = useDispatch<AppDispatch>();
  const key = rowKey(row);

  function open() {
    dispatch(openCustomerDetail(key));
    void dispatch(loadCustomerDetail(key));
  }

  return (
    <tr onClick={open}>
      <td>
        <div className="cust-cust">
          <div className="cust-avatar" aria-hidden>
            <UserRound size={16} strokeWidth={1.8} />
          </div>
          <div>
            <button
              type="button"
              className="cust-name"
              onClick={(event) => {
                event.stopPropagation();
                open();
              }}
            >
              {row.name}
            </button>
            <div className="cust-badges">
              {row.creditDuePaise > 0 ? (
                <span className="cust-due">{CUSTOMERS_CONTENT.due(formatPaise(row.creditDuePaise))}</span>
              ) : null}
              {row.chronicRx ? <span className="cust-rx">{CUSTOMERS_CONTENT.rx}</span> : null}
            </div>
          </div>
        </div>
      </td>
      <td>{formatPhone(row.phone)}</td>
      <td className="num">{row.orderCount}</td>
      <td>
        <div className="cust-channel" aria-label={`${row.onlineOrders} online, ${row.storeOrders} store`}>
          <span>
            <Globe size={13} strokeWidth={1.8} aria-hidden />
            {row.onlineOrders}
          </span>
          <span>·</span>
          <span>
            <Store size={13} strokeWidth={1.8} aria-hidden />
            {row.storeOrders}
          </span>
        </div>
      </td>
      <td className="num">{row.unitsSold}</td>
      <td>{relativeTime(row.lastVisitAt)}</td>
      <td>
        <span className="cust-pts">{CUSTOMERS_CONTENT.pts(row.loyaltyPoints)}</span>
      </td>
      <td className="num">{formatPaise(row.lifetimeValuePaise)}</td>
    </tr>
  );
}
