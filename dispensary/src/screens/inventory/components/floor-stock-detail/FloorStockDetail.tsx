import type { StockBatchDetail } from '@/services/inventory';

export type FloorStockDetailProps = {
  productName: string | null;
  productSku: string | null;
  batches: StockBatchDetail[];
  loading: boolean;
};

export function FloorStockDetail({
  productName,
  productSku,
  batches,
  loading,
}: FloorStockDetailProps) {
  if (!productName) {
    return (
      <section className="border border-line bg-surface p-4" aria-label="Batch detail">
        <p className="font-mono text-[11px] tracking-wide text-muted">Batch detail</p>
        <p className="mt-2 text-sm text-muted">Select a stock line to see batch and expiry.</p>
      </section>
    );
  }

  return (
    <section className="border border-line bg-surface p-4" aria-label="Batch detail">
      <p className="font-mono text-[11px] tracking-wide text-muted">Batch detail</p>
      <h2 className="mt-1 text-lg font-semibold text-ink">{productName}</h2>
      <p className="font-mono text-xs text-muted">{productSku}</p>
      {loading ? (
        <p className="mt-3 text-sm text-muted" role="status">
          Loading batches…
        </p>
      ) : batches.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No batch lines on this outlet for this SKU.</p>
      ) : (
        <ul className="mt-3 grid gap-2" aria-label="Batches on this outlet">
          {batches.map((batch) => (
            <li key={batch.balanceId} className="grid gap-1 border border-line px-2.5 py-2 text-sm">
              <p className="font-mono text-ink">
                {batch.batchNumber ?? 'No batch'}
                <span className="ml-2 tabular-nums text-muted">Qty {batch.quantity}</span>
              </p>
              <p className="font-mono text-xs text-muted">
                Mfg {batch.manufacturedOn ?? '—'} · Exp {batch.expiresOn ?? '—'}
              </p>
              <p className="font-mono text-xs tabular-nums text-muted">
                Purchase ₹{((batch.purchasePricePaise ?? 0) / 100).toFixed(2)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
