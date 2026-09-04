import type { StockTakeLine } from '@/services/stockTakes';

export type StockTakeVarianceListProps = {
  lines: StockTakeLine[];
};

export function StockTakeVarianceList({ lines }: StockTakeVarianceListProps) {
  const variances = lines.filter(
    (line) => line.countedQuantity != null && Number(line.varianceQuantity) !== 0,
  );
  return (
    <section className="border border-line bg-surface">
      <header className="border-b border-line px-3 py-2">
        <h2 className="text-sm font-semibold text-ink">Variance review</h2>
      </header>
      {variances.length === 0 ? (
        <p className="px-3 py-4 text-sm text-muted">
          No variances yet. Counted qty matching book qty will not raise a write-off.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {variances.map((line) => (
            <li key={line.id} className="grid gap-1 px-3 py-3">
              <p className="text-sm font-medium text-ink">
                {line.productName} · {line.batchNumber ?? 'no batch'}
              </p>
              <p className="font-mono text-xs text-muted">
                Book {line.expectedQuantity} → counted {line.countedQuantity} ·{' '}
                {line.direction === 'IN' ? 'add' : 'remove'}{' '}
                {Math.abs(Number(line.varianceQuantity))}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
