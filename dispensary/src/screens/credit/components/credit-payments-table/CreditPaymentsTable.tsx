import { useSelector } from 'react-redux';
import { CREDIT_CONTENT } from '../../CreditScreen.content';
import {
  formatIstDateTime,
  formatPaise,
  modeLabel,
} from '../../CreditScreen.utils';
import {
  selectCreditPayments,
  selectPaymentsTotalPaise,
} from '../../store/credit.selectors';

export function CreditPaymentsTable() {
  const payments = useSelector(selectCreditPayments);
  const total = useSelector(selectPaymentsTotalPaise);

  if (payments.length === 0) {
    return (
      <div className="credit-card">
        <div className="credit-empty">
          <strong>{CREDIT_CONTENT.emptyPayments}</strong>
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
              <th>{CREDIT_CONTENT.columns.receipt}</th>
              <th>{CREDIT_CONTENT.columns.datetime}</th>
              <th>{CREDIT_CONTENT.columns.customer}</th>
              <th>{CREDIT_CONTENT.columns.mode}</th>
              <th>{CREDIT_CONTENT.columns.note}</th>
              <th className="num">{CREDIT_CONTENT.columns.amount}</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((row) => (
              <tr key={row.id} style={{ cursor: 'default' }}>
                <td>{row.receiptLabel}</td>
                <td>{formatIstDateTime(row.occurredAt)}</td>
                <td>{row.customerName}</td>
                <td>{modeLabel(row.mode)}</td>
                <td>{row.reference?.trim() || '—'}</td>
                <td className="num plus">+{formatPaise(row.amountPaise)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5}>{CREDIT_CONTENT.footerPayments(payments.length)}</td>
              <td className="num plus">{formatPaise(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
