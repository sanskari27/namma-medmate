import { AlertTriangle, FilePlus2, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { CREDIT_CONTENT } from '../../CreditScreen.content';
import { newCreditSaleHref } from '../../CreditScreen.utils';
import {
  selectCreditItems,
  selectCreditOverdueOnly,
  selectCreditQuery,
  selectCreditSort,
  selectCreditTab,
} from '../../store/credit.selectors';
import {
  setCreditQuery,
  setCreditSort,
  setCreditTab,
  toggleOverdueOnly,
} from '../../store/credit.slice';

export function CreditToolbar() {
  const dispatch = useDispatch<AppDispatch>();
  const tab = useSelector(selectCreditTab);
  const query = useSelector(selectCreditQuery);
  const sort = useSelector(selectCreditSort);
  const overdueOnly = useSelector(selectCreditOverdueOnly);
  const items = useSelector(selectCreditItems);

  return (
    <div className="credit-toolbar">
      <div className="credit-tabs" role="tablist" aria-label="Credit views">
        <button
          type="button"
          role="tab"
          data-on={tab === 'outstanding' ? 'true' : 'false'}
          aria-selected={tab === 'outstanding'}
          onClick={() => dispatch(setCreditTab('outstanding'))}
        >
          {CREDIT_CONTENT.tabs.outstanding}
          {items.length > 0 ? ` · ${items.length}` : ''}
        </button>
        <button
          type="button"
          role="tab"
          data-on={tab === 'payments' ? 'true' : 'false'}
          aria-selected={tab === 'payments'}
          onClick={() => dispatch(setCreditTab('payments'))}
        >
          {CREDIT_CONTENT.tabs.payments}
        </button>
      </div>

      {tab === 'outstanding' ? (
        <>
          <label className="credit-search">
            <Search size={15} strokeWidth={1.8} aria-hidden />
            <input
              value={query}
              onChange={(event) => dispatch(setCreditQuery(event.target.value))}
              placeholder={CREDIT_CONTENT.searchPlaceholder}
              aria-label={CREDIT_CONTENT.searchPlaceholder}
            />
          </label>
          <div className="credit-toolbar-actions">
            <button
              type="button"
              className="credit-btn credit-btn-ghost"
              data-on={overdueOnly ? 'true' : 'false'}
              aria-pressed={overdueOnly}
              onClick={() => dispatch(toggleOverdueOnly())}
            >
              <AlertTriangle size={14} strokeWidth={1.8} aria-hidden />
              {CREDIT_CONTENT.overdueOnly}
            </button>
            <div className="credit-seg" role="group" aria-label="Sort">
              <button
                type="button"
                data-on={sort === 'amount' ? 'true' : 'false'}
                aria-pressed={sort === 'amount'}
                onClick={() => dispatch(setCreditSort('amount'))}
              >
                {CREDIT_CONTENT.sortAmount}
              </button>
              <button
                type="button"
                data-on={sort === 'oldest' ? 'true' : 'false'}
                aria-pressed={sort === 'oldest'}
                onClick={() => dispatch(setCreditSort('oldest'))}
              >
                {CREDIT_CONTENT.sortOldest}
              </button>
            </div>
            <Link to={newCreditSaleHref()} className="credit-btn credit-btn-primary">
              <FilePlus2 size={14} strokeWidth={1.8} aria-hidden />
              {CREDIT_CONTENT.newCreditSale}
            </Link>
          </div>
        </>
      ) : (
        <div className="credit-toolbar-actions">
          <Link to={newCreditSaleHref()} className="credit-btn credit-btn-primary">
            <FilePlus2 size={14} strokeWidth={1.8} aria-hidden />
            {CREDIT_CONTENT.newCreditSale}
          </Link>
        </div>
      )}
    </div>
  );
}
