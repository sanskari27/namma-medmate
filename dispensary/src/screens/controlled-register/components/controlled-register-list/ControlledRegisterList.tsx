import type { ControlledSaleLine } from '@/services/controlledRegister';
import { formatIst, kindLabel } from '../../ControlledRegisterScreen.utils';

export type ControlledRegisterListProps = {
  items: ControlledSaleLine[];
};

export function ControlledRegisterList({ items }: ControlledRegisterListProps) {
  if (items.length === 0) {
    return <p className="nd-loading">No Schedule sales match these filters.</p>;
  }
  return (
    <div className="nd-card">
      <div className="nd-tbl-wrap">
        <table className="nd-tbl" aria-label="Schedule sales">
          <thead>
            <tr>
              <th>When (IST)</th>
              <th>Kind</th>
              <th>Pack</th>
              <th>Batch</th>
              <th>Qty</th>
              <th>Rx</th>
              <th>Patient</th>
              <th>Pharmacist</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id}>
                <td className="nd-mono">{formatIst(row.occurredAt)}</td>
                <td>{kindLabel(row.kind)}</td>
                <td>
                  <b>{row.productName}</b>
                  <div className="nd-muted nd-mono">
                    {row.sku}
                    {row.scheduleClassification ? ` ${row.scheduleClassification}` : ''}
                  </div>
                </td>
                <td className="nd-mono">{row.batchNumber}</td>
                <td className="num">{row.quantity}</td>
                <td className="nd-mono">{row.prescriptionReference}</td>
                <td>{row.patientName}</td>
                <td>{row.pharmacistName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
