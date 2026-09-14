import { X } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { EXPENSES_CONTENT } from '../../ExpensesScreen.content';
import {
  formatExpenseWhen,
  formatPaise,
  paymentLabel,
} from '../../ExpensesScreen.utils';
import {
  openEditExpense,
  removeExpense,
  selectExpensesDeletingId,
  selectExpensesItems,
  selectExpensesStatus,
} from '../../store';

export function ExpensesTable() {
  const dispatch = useDispatch<AppDispatch>();
  const items = useSelector(selectExpensesItems);
  const status = useSelector(selectExpensesStatus);
  const deletingId = useSelector(selectExpensesDeletingId);

  if (status === 'loading') {
    return <div className="ex-loading">{EXPENSES_CONTENT.loading}</div>;
  }

  return (
    <div className="ex-panel">
      <div className="ex-table-wrap">
        {items.length === 0 ? (
          <p className="ex-empty">{EXPENSES_CONTENT.emptyTransactions}</p>
        ) : (
          <table className="ex-table">
            <thead>
              <tr>
                <th>{EXPENSES_CONTENT.colDate}</th>
                <th>{EXPENSES_CONTENT.colExpenseNo}</th>
                <th>{EXPENSES_CONTENT.colParty}</th>
                <th>{EXPENSES_CONTENT.colCategory}</th>
                <th>{EXPENSES_CONTENT.colPayment}</th>
                <th>{EXPENSES_CONTENT.colAmount}</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => dispatch(openEditExpense(row))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      dispatch(openEditExpense(row));
                    }
                  }}
                  tabIndex={0}
                >
                  <td className="ex-muted">{formatExpenseWhen(row.occurredOn, row.createdAt)}</td>
                  <td className="ex-strong">{row.expenseNo}</td>
                  <td>{row.partyName || '—'}</td>
                  <td>
                    <span className="ex-chip" title={row.categoryLabel}>
                      {row.categoryLabel}
                    </span>
                  </td>
                  <td>{paymentLabel(row.paymentMode)}</td>
                  <td className="ex-strong">{formatPaise(row.amountPaise)}</td>
                  <td>
                    <button
                      type="button"
                      className="ex-row-del"
                      aria-label={EXPENSES_CONTENT.delete}
                      disabled={deletingId === row.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        void dispatch(removeExpense(row.id));
                      }}
                    >
                      <X size={14} aria-hidden />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
