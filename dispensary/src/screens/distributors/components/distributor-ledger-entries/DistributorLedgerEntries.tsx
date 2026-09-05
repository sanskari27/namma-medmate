import { formatPaise } from '../../DistributorsScreen.utils';
import type { SupplierLedgerEntry } from '@/services/suppliers';

export type DistributorLedgerEntriesProps = {
  entries: SupplierLedgerEntry[];
};

function typeLabel(type: SupplierLedgerEntry['type']): string {
  switch (type) {
    case 'INVOICE':
      return 'Invoice';
    case 'DEBIT_NOTE':
      return 'Debit note';
    case 'PAYMENT':
      return 'Payment';
    default:
      return type;
  }
}

function formatOccurredAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function DistributorLedgerEntries({ entries }: DistributorLedgerEntriesProps) {
  if (entries.length === 0) {
    return (
      <p className="border border-line bg-canvas px-3 py-3 text-sm text-muted">
        No khata lines yet for this stockist on this outlet.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-line border border-line" aria-label="Khata lines">
      {entries.map((row) => (
        <li key={row.id} className="grid gap-0.5 px-3 py-2 text-sm">
          <span className="text-ink">{typeLabel(row.type)}</span>
          <span className="font-mono text-ink">{formatPaise(row.amountPaise)}</span>
          <span className="font-mono text-xs text-muted">
            Balance {formatPaise(row.balanceAfterPaise)}
          </span>
          {row.paymentMode ? (
            <span className="text-xs text-muted">
              {row.paymentMode}
              {row.paymentReference ? ` · ${row.paymentReference}` : ''}
            </span>
          ) : null}
          {row.dueOn ? <span className="text-xs text-muted">Due {row.dueOn}</span> : null}
          <span className="text-xs text-muted">{formatOccurredAt(row.occurredAt)}</span>
        </li>
      ))}
    </ul>
  );
}
