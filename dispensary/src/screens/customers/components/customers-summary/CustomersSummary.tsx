import {
  FileText,
  NotebookPen,
  RefreshCw,
  ShoppingCart,
  Users,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { CUSTOMERS_CONTENT } from '../../CustomersScreen.content';
import { formatPaise } from '../../CustomersScreen.utils';
import { selectCustomersSummary } from '../../store/customers.selectors';

export function CustomersSummary() {
  const stats = useSelector(selectCustomersSummary);

  return (
    <div className="cust-stats" aria-label="Customers summary">
      <div className="cust-stat">
        <div className="ico" aria-hidden>
          <Users size={15} strokeWidth={1.8} />
        </div>
        <div className="k">{CUSTOMERS_CONTENT.summary.customers}</div>
        <div className="v">{stats.customerCount}</div>
        {stats.hasWalkIns ? <div className="s">{CUSTOMERS_CONTENT.summary.walkIns}</div> : null}
      </div>
      <div className="cust-stat" data-tone="blue">
        <div className="ico" aria-hidden>
          <ShoppingCart size={15} strokeWidth={1.8} />
        </div>
        <div className="k">{CUSTOMERS_CONTENT.summary.lifetime}</div>
        <div className="v" style={{ fontSize: 22 }}>
          {formatPaise(stats.lifetimePaise)}
        </div>
      </div>
      <div className="cust-stat" data-tone="orange">
        <div className="ico" aria-hidden>
          <RefreshCw size={15} strokeWidth={1.8} />
        </div>
        <div className="k">{CUSTOMERS_CONTENT.summary.repeat}</div>
        <div className="v">{stats.repeatCount}</div>
      </div>
      <div className="cust-stat" data-tone="rose">
        <div className="ico" aria-hidden>
          <FileText size={15} strokeWidth={1.8} />
        </div>
        <div className="k">{CUSTOMERS_CONTENT.summary.chronic}</div>
        <div className="v">{stats.chronicCount}</div>
      </div>
      <div className="cust-stat" data-tone="gold">
        <div className="ico" aria-hidden>
          <NotebookPen size={15} strokeWidth={1.8} />
        </div>
        <div className="k">{CUSTOMERS_CONTENT.summary.credit}</div>
        <div className="v" style={{ fontSize: 22 }}>
          {formatPaise(stats.creditOutstandingPaise)}
        </div>
        <div className="s">{CUSTOMERS_CONTENT.summary.khata}</div>
      </div>
    </div>
  );
}
