import { formatPaise } from '../../DistributorsScreen.utils';
import type { SupplierDueItem } from '@/services/suppliers';

export type DistributorDueStripProps = {
  dues: SupplierDueItem[];
};

function formatDueOn(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00+05:30`);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function DistributorDueStrip({ dues }: DistributorDueStripProps) {
  return (
    <section className="border border-line bg-surface px-3 py-2" aria-label="Due this week">
      <p className="font-mono text-xs tracking-wide text-muted">Due this week</p>
      {dues.length === 0 ? (
        <p className="mt-1 text-sm text-muted">No stockist dues this week.</p>
      ) : (
        <ul className="mt-1 divide-y divide-line">
          {dues.map((row) => (
            <li
              key={row.supplierId}
              className="flex flex-wrap items-baseline justify-between gap-2 py-1.5 text-sm"
            >
              <span className="text-ink">{row.legalName}</span>
              <span className="font-mono text-ink">{formatPaise(row.balancePaise)}</span>
              <span className={row.overdue ? 'text-danger' : 'text-muted'}>
                {row.overdue ? 'Overdue' : 'Due'} {formatDueOn(row.dueOn)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
