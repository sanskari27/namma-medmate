import type { ControlledSaleLine } from '@/services/controlledRegister';
import { formatIst, kindLabel } from '../../ControlledRegisterScreen.utils';

export type ControlledRegisterListProps = {
  items: ControlledSaleLine[];
};

export function ControlledRegisterList({ items }: ControlledRegisterListProps) {
  if (items.length === 0) {
    return (
      <p className="border border-dashed border-line px-3 py-6 text-sm text-muted">
        No Schedule sales match these filters.
      </p>
    );
  }
  return (
    <section className="min-h-0 overflow-auto border border-line bg-surface">
      <table className="w-full text-left text-sm" aria-label="Schedule sales">
        <thead className="sticky top-0 bg-surface text-xs text-muted">
          <tr className="border-b border-line">
            <th className="px-3 py-2 font-medium">When (IST)</th>
            <th className="px-3 py-2 font-medium">Kind</th>
            <th className="px-3 py-2 font-medium">Pack</th>
            <th className="px-3 py-2 font-medium">Batch</th>
            <th className="px-3 py-2 font-medium">Qty</th>
            <th className="px-3 py-2 font-medium">Rx</th>
            <th className="px-3 py-2 font-medium">Patient</th>
            <th className="px-3 py-2 font-medium">Pharmacist</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.id} className="border-b border-line last:border-b-0">
              <td className="px-3 py-2 font-mono text-xs text-ink">{formatIst(row.occurredAt)}</td>
              <td className="px-3 py-2 text-ink">{kindLabel(row.kind)}</td>
              <td className="px-3 py-2">
                <p className="font-medium text-ink">{row.productName}</p>
                <p className="font-mono text-xs text-muted">
                  {row.sku}
                  {row.scheduleClassification ? ` ${row.scheduleClassification}` : ''}
                </p>
              </td>
              <td className="px-3 py-2 font-mono text-xs text-ink">{row.batchNumber}</td>
              <td className="px-3 py-2 font-mono text-ink">{row.quantity}</td>
              <td className="px-3 py-2 font-mono text-xs text-ink">{row.prescriptionReference}</td>
              <td className="px-3 py-2 text-ink">{row.patientName}</td>
              <td className="px-3 py-2 text-ink">{row.pharmacistName}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
