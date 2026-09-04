import type { StockTake } from '@/services/stockTakes';

export type StockTakeHistoryProps = {
  items: StockTake[];
};

function formatIst(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(iso));
}

export function StockTakeHistory({ items }: StockTakeHistoryProps) {
  return (
    <section className="border border-line bg-surface">
      <header className="border-b border-line px-3 py-2">
        <h2 className="text-sm font-semibold text-ink">Earlier counts</h2>
      </header>
      {items.length === 0 ? (
        <p className="px-3 py-4 text-sm text-muted">No posted or abandoned counts yet.</p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((row) => (
            <li key={row.id} className="grid gap-1 px-3 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-ink">
                  {row.status === 'POSTED' ? 'Posted' : 'Abandoned'} · {row.lines.length} lines
                </p>
                <p className="font-mono text-xs text-muted">{formatIst(row.createdAt)} IST</p>
              </div>
              <p className="text-xs text-muted">
                {row.status === 'POSTED'
                  ? 'Variances went to Adjustments for till sign-off.'
                  : 'Count closed without posting variances.'}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
