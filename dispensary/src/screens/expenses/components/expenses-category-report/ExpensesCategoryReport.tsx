import { useSelector } from 'react-redux';
import { EXPENSES_CONTENT } from '../../ExpensesScreen.content';
import { formatPaise } from '../../ExpensesScreen.utils';
import {
  selectExpensesPeriodMeta,
  selectExpensesStatus,
  selectExpensesTotals,
} from '../../store';

export function ExpensesCategoryReport() {
  const totals = useSelector(selectExpensesTotals);
  const period = useSelector(selectExpensesPeriodMeta);
  const status = useSelector(selectExpensesStatus);
  const rows = totals?.byCategory ?? [];

  if (status === 'loading') {
    return <div className="ex-loading">{EXPENSES_CONTENT.loading}</div>;
  }

  const entryTotal = rows.reduce((sum, row) => sum + row.entries, 0);
  const taxableTotal = rows.reduce((sum, row) => sum + row.taxablePaise, 0);
  const gstTotal = rows.reduce((sum, row) => sum + row.gstPaise, 0);
  const amountTotal = rows.reduce((sum, row) => sum + row.totalPaise, 0);

  return (
    <div className="ex-panel">
      <div className="ex-panel-head">
        <h2>{EXPENSES_CONTENT.categoryReportTitle}</h2>
        <span className="ex-pill">• {period.label}</span>
      </div>
      <p className="ex-panel-hint">{EXPENSES_CONTENT.categoryReportHint(rows.length)}</p>
      <div className="ex-table-wrap">
        {rows.length === 0 ? (
          <p className="ex-empty">{EXPENSES_CONTENT.emptyCategories}</p>
        ) : (
          <table className="ex-table">
            <thead>
              <tr>
                <th>{EXPENSES_CONTENT.colCategory}</th>
                <th>{EXPENSES_CONTENT.colEntries}</th>
                <th>{EXPENSES_CONTENT.colTaxable}</th>
                <th>{EXPENSES_CONTENT.colGst}</th>
                <th>{EXPENSES_CONTENT.colAmount}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.categoryId}>
                  <td className="ex-strong">{row.label}</td>
                  <td>{row.entries}</td>
                  <td>{formatPaise(row.taxablePaise)}</td>
                  <td>{formatPaise(row.gstPaise)}</td>
                  <td className="ex-strong">{formatPaise(row.totalPaise)}</td>
                </tr>
              ))}
              <tr className="ex-total-row">
                <td>{EXPENSES_CONTENT.total}</td>
                <td>{entryTotal}</td>
                <td>{formatPaise(taxableTotal)}</td>
                <td>{formatPaise(gstTotal)}</td>
                <td>{formatPaise(amountTotal)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
