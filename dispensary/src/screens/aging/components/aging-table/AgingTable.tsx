import { useSelector } from 'react-redux';
import { AGING_CONTENT } from '../../AgingScreen.content';
import { bucketForDays, BUCKET_LABELS, formatPaise } from '../../AgingScreen.utils';
import {
  selectAgingActiveReport,
  selectAgingBook,
  selectAgingPeriodLabel,
  selectAgingStatus,
} from '../../store';

export function AgingTable() {
  const status = useSelector(selectAgingStatus);
  const book = useSelector(selectAgingBook);
  const report = useSelector(selectAgingActiveReport);
  const period = useSelector(selectAgingPeriodLabel);
  const title =
    book === 'payables' ? AGING_CONTENT.payablesTitle : AGING_CONTENT.receivablesTitle;
  const hint = book === 'payables' ? AGING_CONTENT.payablesHint : AGING_CONTENT.receivablesHint;
  const empty =
    book === 'payables' ? AGING_CONTENT.emptyPayables : AGING_CONTENT.emptyReceivables;

  if (status === 'loading') {
    return <p className="ag-loading">{AGING_CONTENT.loading}</p>;
  }

  return (
    <section aria-label={title}>
      <div className="ag-head">
        <h2>{title}</h2>
        <span className="ag-pill">{period}</span>
      </div>
      <p className="ag-hint">
        {hint} · {report.items.length} row{report.items.length === 1 ? '' : 's'}
      </p>
      {report.items.length === 0 ? (
        <p className="ag-empty">{empty}</p>
      ) : (
        <div className="ag-table-wrap">
          <table className="ag-table">
            <thead>
              <tr>
                <th>{AGING_CONTENT.colParty}</th>
                <th className="ag-num">{AGING_CONTENT.colOutstanding}</th>
                <th className="ag-num">{AGING_CONTENT.colAge}</th>
                <th>{AGING_CONTENT.colBucket}</th>
              </tr>
            </thead>
            <tbody>
              {report.items.map((row) => (
                <tr key={row.partyId}>
                  <td>{row.name || '—'}</td>
                  <td className="ag-num">{formatPaise(row.amountPaise)}</td>
                  <td className="ag-num">{row.days}</td>
                  <td>{BUCKET_LABELS[bucketForDays(row.days)]}</td>
                </tr>
              ))}
              <tr className="ag-total">
                <td>{AGING_CONTENT.total}</td>
                <td className="ag-num">{formatPaise(report.totalPaise)}</td>
                <td />
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
