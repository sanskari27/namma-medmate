import type { HospitalSalesRegister, HospitalSalesRegisterRow } from '@/services/hospital';
import { HOSPITAL_SALES_REGISTER_CONTENT } from '../../HospitalSalesRegisterScreen.content';
import {
  formatIstDate,
  formatPaise,
  paymentLabel,
  sourceLabel,
} from '../../HospitalSalesRegisterScreen.utils';

type Props = {
  register: HospitalSalesRegister | null;
};

export function HospitalSalesRegisterTable({ register }: Props) {
  const items = register?.items ?? [];
  return (
    <section className="ps-table-wrap" aria-label={HOSPITAL_SALES_REGISTER_CONTENT.tableLabel}>
      {register ? (
        <p className="ps-totals">
          <span>
            {HOSPITAL_SALES_REGISTER_CONTENT.countLabel}{' '}
            <strong>{register.totals.count}</strong>
          </span>
          <span>
            {HOSPITAL_SALES_REGISTER_CONTENT.revenueLabel}{' '}
            <strong>{formatPaise(register.totals.revenuePaise)}</strong>
          </span>
          <span>
            {HOSPITAL_SALES_REGISTER_CONTENT.paidLabelTile}{' '}
            <strong>{formatPaise(register.totals.paidPaise)}</strong>
          </span>
          <span>
            {HOSPITAL_SALES_REGISTER_CONTENT.unpaidLabelTile}{' '}
            <strong>{formatPaise(register.totals.unpaidPaise)}</strong>
          </span>
          <span>
            {HOSPITAL_SALES_REGISTER_CONTENT.insuranceLabel}{' '}
            <strong>{formatPaise(register.totals.insurancePaise)}</strong>
          </span>
        </p>
      ) : null}
      {items.length === 0 ? (
        <p className="ps-empty">{HOSPITAL_SALES_REGISTER_CONTENT.empty}</p>
      ) : (
        <table className="ps-table">
          <thead>
            <tr>
              <th scope="col">{HOSPITAL_SALES_REGISTER_CONTENT.colInvoice}</th>
              <th scope="col">{HOSPITAL_SALES_REGISTER_CONTENT.colDate}</th>
              <th scope="col">{HOSPITAL_SALES_REGISTER_CONTENT.colSource}</th>
              <th scope="col">{HOSPITAL_SALES_REGISTER_CONTENT.colPatient}</th>
              <th scope="col">{HOSPITAL_SALES_REGISTER_CONTENT.colPayment}</th>
              <th scope="col">{HOSPITAL_SALES_REGISTER_CONTENT.colInsurer}</th>
              <th scope="col">{HOSPITAL_SALES_REGISTER_CONTENT.colRevenue}</th>
              <th scope="col">{HOSPITAL_SALES_REGISTER_CONTENT.colDue}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <RegisterRow key={row.id} row={row} />
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function RegisterRow({ row }: { row: HospitalSalesRegisterRow }) {
  return (
    <tr>
      <td>{row.invoiceNumber}</td>
      <td>{formatIstDate(row.completedAt)}</td>
      <td>{sourceLabel(row.saleSource)}</td>
      <td>{row.patientName ?? row.uhid ?? 'Walk-in'}</td>
      <td>{row.paymentModes.map(paymentLabel).join(', ')}</td>
      <td>{row.insurerName ?? '—'}</td>
      <td>{formatPaise(row.totalPaise)}</td>
      <td>{formatPaise(row.amountDuePaise)}</td>
    </tr>
  );
}
