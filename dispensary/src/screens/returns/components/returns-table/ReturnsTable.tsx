import { useSelector } from 'react-redux';
import { RETURNS_CONTENT } from '../../ReturnsScreen.content';
import { selectFilteredReturns } from '../../store/returns.selectors';
import { ReturnsRow } from '../returns-row';

export function ReturnsTable() {
  const rows = useSelector(selectFilteredReturns);

  if (rows.length === 0) {
    return (
      <div className="returns-card">
        <div className="returns-empty">
          <strong>{RETURNS_CONTENT.emptyTitle}</strong>
          {RETURNS_CONTENT.emptyBody}
        </div>
      </div>
    );
  }

  return (
    <div className="returns-card">
      <div className="returns-tbl-wrap">
        <table className="returns-tbl">
          <thead>
            <tr>
              <th>{RETURNS_CONTENT.columns.invoice}</th>
              <th>{RETURNS_CONTENT.columns.date}</th>
              <th>{RETURNS_CONTENT.columns.customer}</th>
              <th>{RETURNS_CONTENT.columns.items}</th>
              <th>{RETURNS_CONTENT.columns.reason}</th>
              <th>{RETURNS_CONTENT.columns.refund}</th>
              <th className="num">{RETURNS_CONTENT.columns.amount}</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <ReturnsRow key={row.id} row={row} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
