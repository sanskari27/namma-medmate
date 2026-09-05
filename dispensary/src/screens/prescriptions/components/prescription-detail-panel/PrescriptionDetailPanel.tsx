import { Button } from '@atoms';
import type { PrescriptionReference } from '@/services/prescriptionReferences';
import { formatIst, formatPaise, reasonLabel, statusLabel } from '../../PrescriptionsScreen.utils';

export type PrescriptionDetailPanelProps = {
  selected: PrescriptionReference | null;
  busy?: boolean;
  onArchive: () => void;
};

export function PrescriptionDetailPanel({
  selected,
  busy = false,
  onArchive,
}: PrescriptionDetailPanelProps) {
  if (!selected) {
    return (
      <p className="border border-dashed border-line px-3 py-6 text-sm text-muted">
        Open an Rx on the left to see lifecycle and source bills.
      </p>
    );
  }
  return (
    <section className="flex min-h-0 flex-col gap-4 border border-line bg-surface p-3" aria-label="Rx detail">
      <div>
        <h2 className="font-mono text-lg font-semibold text-ink">{selected.prescriptionReference}</h2>
        <p className="text-sm text-muted">
          {selected.customerName} · {selected.branchName || 'This outlet'}
        </p>
      </div>
      <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted">Status</dt>
        <dd className="text-ink">{statusLabel(selected.status)}</dd>
        <dt className="text-muted">Attached</dt>
        <dd className="font-mono text-ink">{formatIst(selected.issuedAt)}</dd>
        <dt className="text-muted">Valid until</dt>
        <dd className="font-mono text-ink">{formatIst(selected.expiresAt)}</dd>
        <dt className="text-muted">Archived</dt>
        <dd className="font-mono text-ink">{formatIst(selected.archivedAt)}</dd>
        <dt className="text-muted">Why</dt>
        <dd className="text-ink">{reasonLabel(selected.archiveReason)}</dd>
      </dl>
      <div>
        <h3 className="mb-2 text-sm font-semibold text-ink">Source bills</h3>
        {selected.invoices.length === 0 ? (
          <p className="text-sm text-muted">No collected bills on this Rx yet.</p>
        ) : (
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-muted">
                <th className="py-1 font-medium">Bill</th>
                <th className="py-1 font-medium">Collected</th>
                <th className="py-1 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {selected.invoices.map((invoice) => (
                <tr key={invoice.id} className="border-b border-line">
                  <td className="py-1.5 font-mono text-ink">{invoice.invoiceNumber}</td>
                  <td className="py-1.5 font-mono text-muted">{formatIst(invoice.completedAt)}</td>
                  <td className="py-1.5 font-mono tabular-nums text-ink">
                    {formatPaise(invoice.totalPaise)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {selected.status === 'ACTIVE' ? (
        <div>
          <Button type="button" disabled={busy} onClick={onArchive}>
            Archive this Rx
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted">History only. This Rx cannot go on a new bill.</p>
      )}
    </section>
  );
}
