import type { DueRefill } from '@/services/customerRefills';
import { formatDueDate } from '@/services/customerRefills';
import { AlarmClock } from 'lucide-react';

export type CustomerDueRefillsStripProps = {
  items: DueRefill[];
  loading: boolean;
  onSelectCustomer: (customerId: string) => void;
};

export function CustomerDueRefillsStrip({
  items,
  loading,
  onSelectCustomer,
}: CustomerDueRefillsStripProps) {
  if (loading) {
    return (
      <div
        className="border border-line bg-surface px-3 py-2 text-sm text-muted"
        role="status"
        aria-label="Due refills"
      >
        Checking due refills…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div
        className="border border-line bg-surface px-3 py-2 text-sm text-muted"
        aria-label="Due refills"
      >
        <div className="flex items-center gap-2">
          <AlarmClock className="size-3.5 shrink-0 text-brand" aria-hidden />
          <span>No refill due on the floor today.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-line bg-surface px-3 py-2" aria-label="Due refills">
      <div className="mb-1.5 flex items-center gap-2">
        <AlarmClock className="size-3.5 shrink-0 text-warn" aria-hidden />
        <p className="font-mono text-[11px] tracking-wide text-muted">
          Due refills ({items.length})
        </p>
      </div>
      <ul className="grid gap-1">
        {items.slice(0, 5).map((row) => (
          <li key={row.refillId}>
            <button
              type="button"
              className="flex w-full flex-wrap items-baseline justify-between gap-2 px-1 py-0.5 text-left text-sm hover:bg-brand-soft"
              onClick={() => onSelectCustomer(row.customerId)}
            >
              <span className="font-medium text-ink">
                {row.customerName}
                <span className="ml-1.5 font-normal text-muted">{row.medicineName}</span>
              </span>
              <span className="font-mono text-xs tabular-nums text-warn">
                {formatDueDate(row.nextDueOn)}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {items.length > 5 ? (
        <p className="mt-1 text-xs text-muted">+{items.length - 5} more due</p>
      ) : null}
    </div>
  );
}
