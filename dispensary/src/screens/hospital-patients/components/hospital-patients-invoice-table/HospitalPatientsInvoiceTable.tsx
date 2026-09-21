import type { HospitalActivePatientInvoice } from '@/services/hospital';
import { HOSPITAL_PATIENTS_CONTENT } from '../../HospitalPatientsScreen.content';
import { formatIstDate, formatPaise, saleSourceLabel } from '../../HospitalPatientsScreen.utils';

type Props = {
  invoices: HospitalActivePatientInvoice[];
};

export function HospitalPatientsInvoiceTable({ invoices }: Props) {
  return (
    <table className="hp-invoices">
      <thead>
        <tr>
          <th>{HOSPITAL_PATIENTS_CONTENT.invoiceNumber}</th>
          <th>{HOSPITAL_PATIENTS_CONTENT.invoiceDate}</th>
          <th>{HOSPITAL_PATIENTS_CONTENT.invoiceSource}</th>
          <th>{HOSPITAL_PATIENTS_CONTENT.invoiceItems}</th>
          <th>{HOSPITAL_PATIENTS_CONTENT.invoicePayment}</th>
          <th>{HOSPITAL_PATIENTS_CONTENT.invoiceStatus}</th>
          <th>{HOSPITAL_PATIENTS_CONTENT.invoiceAmount}</th>
        </tr>
      </thead>
      <tbody>
        {invoices.map((invoice) => (
          <tr key={invoice.id}>
            <td className="hp-mono">{invoice.invoiceNumber}</td>
            <td>{formatIstDate(invoice.completedAt)}</td>
            <td>{saleSourceLabel(invoice.saleSource)}</td>
            <td>{invoice.itemCount}</td>
            <td>{invoice.paymentLabel}</td>
            <td>{invoice.status === 'COMPLETED' ? 'Completed' : invoice.status}</td>
            <td className="hp-mono">{formatPaise(invoice.totalPaise)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
