import { Download, FileText, Plus, Search } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { CUSTOMERS_CONTENT } from '../../CustomersScreen.content';
import type { CustomersSort } from '../../CustomersScreen.utils';
import {
  downloadCustomersExcel,
  downloadCustomersPdf,
} from '../../CustomersScreen.utils';
import {
  selectCustomersQuery,
  selectCustomersSort,
  selectSortedCustomers,
} from '../../store/customers.selectors';
import {
  openCreateCustomer,
  setCustomersQuery,
  setCustomersSort,
} from '../../store/customers.slice';

const SORTS: { id: CustomersSort; label: string }[] = [
  { id: 'spenders', label: CUSTOMERS_CONTENT.sort.spenders },
  { id: 'orders', label: CUSTOMERS_CONTENT.sort.orders },
  { id: 'recent', label: CUSTOMERS_CONTENT.sort.recent },
];

export function CustomersToolbar() {
  const dispatch = useDispatch<AppDispatch>();
  const sort = useSelector(selectCustomersSort);
  const query = useSelector(selectCustomersQuery);
  const rows = useSelector(selectSortedCustomers);

  return (
    <div className="cust-toolbar">
      <label className="cust-search">
        <Search size={16} strokeWidth={1.8} aria-hidden />
        <input
          type="search"
          value={query}
          placeholder={CUSTOMERS_CONTENT.searchPlaceholder}
          aria-label={CUSTOMERS_CONTENT.searchPlaceholder}
          onChange={(event) => dispatch(setCustomersQuery(event.target.value))}
        />
      </label>
      <div className="cust-seg" role="tablist" aria-label="Customer sort">
        {SORTS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={sort === item.id}
            data-on={sort === item.id}
            onClick={() => dispatch(setCustomersSort(item.id))}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="cust-toolbar-actions">
        <button
          type="button"
          className="cust-btn cust-btn-ghost"
          onClick={() => downloadCustomersExcel(rows)}
        >
          <Download size={14} strokeWidth={1.8} aria-hidden />
          {CUSTOMERS_CONTENT.export.excel}
        </button>
        <button
          type="button"
          className="cust-btn cust-btn-ghost"
          onClick={() => downloadCustomersPdf(rows)}
        >
          <FileText size={14} strokeWidth={1.8} aria-hidden />
          {CUSTOMERS_CONTENT.export.pdf}
        </button>
        <button
          type="button"
          className="cust-btn cust-btn-primary"
          onClick={() => dispatch(openCreateCustomer())}
        >
          <Plus size={15} strokeWidth={2.2} aria-hidden />
          {CUSTOMERS_CONTENT.addCustomer}
        </button>
      </div>
    </div>
  );
}
