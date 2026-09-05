import type { AgingParty } from '@/services/aging';
import { formatAgeOn, formatPaise } from '../../AgingScreen.utils';

export type AgingPartyListProps = {
  title: string;
  empty: string;
  items: AgingParty[];
};

export function AgingPartyList({ title, empty, items }: AgingPartyListProps) {
  return (
    <section className="flex min-h-0 min-w-0 flex-col border border-line bg-surface">
      <h2 className="border-b border-line px-3 py-2 text-sm font-semibold text-ink">{title}</h2>
      {items.length === 0 ? (
        <p className="px-3 py-6 text-sm text-muted">{empty}</p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((row) => (
            <li key={row.partyId} className="flex items-start justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{row.name}</p>
                <p className="text-xs text-muted">
                  {row.days} days · {formatAgeOn(row.ageOn)}
                </p>
              </div>
              <p className="shrink-0 font-mono text-sm text-ink">{formatPaise(row.amountPaise)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
