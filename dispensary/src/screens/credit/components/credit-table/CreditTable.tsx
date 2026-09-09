import { useSelector } from 'react-redux';
import { CREDIT_CONTENT } from '../../CreditScreen.content';
import { formatPaise } from '../../CreditScreen.utils';
import {
  selectCreditAgingFilter,
  selectCreditOverdueOnly,
  selectCreditQuery,
  selectFilteredOutstanding,
} from '../../store/credit.selectors';
import { CreditRow } from '../credit-row';

export function CreditTable() {
  const rows = useSelector(selectFilteredOutstanding);
  const query = useSelector(selectCreditQuery);
  const overdueOnly = useSelector(selectCreditOverdueOnly);
  const agingFilter = useSelector(selectCreditAgingFilter);
  const filtered = Boolean(query.trim() || overdueOnly || agingFilter);
  const total = rows.reduce((sum, row) => sum + row.balancePaise, 0);

  if (rows.length === 0) {
    return (
      <div className="credit-card">
        <div className="credit-empty">
          <strong>
            {filtered ? CREDIT_CONTENT.emptyFiltered : CREDIT_CONTENT.emptyOutstanding}
          </strong>
        </div>
      </div>
    );
  }

  return (
    <div className="credit-card">
      <div className="credit-tbl-wrap">
        <table className="credit-tbl">
          <thead>
            <tr>
              <th>{CREDIT_CONTENT.columns.customer}</th>
              <th>{CREDIT_CONTENT.columns.phone}</th>
              <th className="num">{CREDIT_CONTENT.columns.bills}</th>
              <th className="num">{CREDIT_CONTENT.columns.given}</th>
              <th className="num">{CREDIT_CONTENT.columns.repaid}</th>
              <th className="num">{CREDIT_CONTENT.columns.outstanding}</th>
              <th>{CREDIT_CONTENT.columns.age}</th>
              <th>{CREDIT_CONTENT.columns.collect}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <CreditRow key={row.customerId} row={row} />
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5}>{CREDIT_CONTENT.footerOutstanding(rows.length)}</td>
              <td className="num due">{formatPaise(total)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
