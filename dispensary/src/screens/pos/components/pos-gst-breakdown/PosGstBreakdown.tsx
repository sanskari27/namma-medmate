import { formatPaise, type BillTotals } from '../../PosScreen.utils';

interface PosGstBreakdownProps {
  totals: BillTotals;
  saved: boolean;
}

export function PosGstBreakdown({ totals, saved }: PosGstBreakdownProps) {
  const inter = totals.taxJurisdiction === 'INTER';
  return (
    <section
      className="space-y-2 rounded border border-line bg-surface p-3"
      aria-label="GST on this bill"
    >
      <h2 className="text-sm font-semibold text-ink">
        {saved ? 'Saved GST on this bill' : 'GST on this bill'}
      </h2>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted">Taxable</dt>
        <dd className="font-mono tabular-nums text-ink">{formatPaise(totals.subtotalPaise)}</dd>
        <dt className="text-muted">Discount</dt>
        <dd className="font-mono tabular-nums text-ink">{formatPaise(totals.discountPaise)}</dd>
        {inter ? (
          <>
            <dt className="text-muted">IGST</dt>
            <dd className="font-mono tabular-nums text-ink">{formatPaise(totals.igstPaise)}</dd>
          </>
        ) : (
          <>
            <dt className="text-muted">CGST</dt>
            <dd className="font-mono tabular-nums text-ink">{formatPaise(totals.cgstPaise)}</dd>
            <dt className="text-muted">SGST</dt>
            <dd className="font-mono tabular-nums text-ink">{formatPaise(totals.sgstPaise)}</dd>
          </>
        )}
        <dt className="text-muted">Grand total</dt>
        <dd className="font-mono tabular-nums font-semibold text-ink">
          {formatPaise(totals.totalPaise)}
        </dd>
      </dl>
    </section>
  );
}
