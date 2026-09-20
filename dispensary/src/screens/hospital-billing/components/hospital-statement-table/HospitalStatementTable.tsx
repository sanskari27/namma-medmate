import type { HospitalStatementLine } from '@/services/hospital';
import { HOSPITAL_BILLING_CONTENT } from '../../HospitalBillingScreen.content';
import { formatIstDate, formatRupees } from '../../HospitalBillingScreen.utils';

export function HospitalStatementTable({ lines }: { lines: HospitalStatementLine[] }) {
  if (lines.length === 0) {
    return (
      <p className="hb-empty" role="status">
        {HOSPITAL_BILLING_CONTENT.statementEmpty}
      </p>
    );
  }

  return (
    <div className="hb-table-wrap">
      <table className="hb-table">
        <caption className="sr-only">{HOSPITAL_BILLING_CONTENT.viewStatement}</caption>
        <thead>
          <tr>
            <th scope="col">{HOSPITAL_BILLING_CONTENT.statementDate}</th>
            <th scope="col">{HOSPITAL_BILLING_CONTENT.statementParticulars}</th>
            <th scope="col">{HOSPITAL_BILLING_CONTENT.statementDebit}</th>
            <th scope="col">{HOSPITAL_BILLING_CONTENT.statementCredit}</th>
            <th scope="col">{HOSPITAL_BILLING_CONTENT.statementBalance}</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => (
            <tr key={`${line.occurredAt}-${line.kind}-${index}`}>
              <td className="font-mono text-[12px]">{formatIstDate(line.occurredAt)}</td>
              <td>{line.particulars}</td>
              <td className="font-mono text-[12px]">
                {line.debitPaise ? `₹${formatRupees(line.debitPaise)}` : '—'}
              </td>
              <td className="font-mono text-[12px]">
                {line.creditPaise ? `₹${formatRupees(line.creditPaise)}` : '—'}
              </td>
              <td className="font-mono text-[12px]">₹{formatRupees(line.balancePaise)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
