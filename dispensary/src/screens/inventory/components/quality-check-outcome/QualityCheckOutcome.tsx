import type { GoodsReceiptDetail } from '@/services/goodsReceipts';
import { formatIst, receiptQcLabel } from '../quality-check-workspace/QualityCheckWorkspace.utils';

export type QualityCheckOutcomeProps = {
  detail: GoodsReceiptDetail;
};

export function QualityCheckOutcome({ detail }: QualityCheckOutcomeProps) {
  return (
    <section
      className="rounded-xl border border-brand/30 bg-brand-soft/50 p-4 text-sm text-ink"
      aria-label="Check outcome"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-brand/40 bg-surface px-2.5 py-0.5 text-xs font-semibold text-brand">
          {receiptQcLabel(detail.status)}
        </span>
        {detail.checkedAt ? (
          <span className="text-xs text-muted">Checked {formatIst(detail.checkedAt)}</span>
        ) : null}
      </div>
      {detail.debitNoteNumber ? (
        <p className="mt-2 font-mono text-sm text-ink">
          <a href="/inventory?view=returns">Open debit note {detail.debitNoteNumber}</a>
        </p>
      ) : null}
      <ul className="mt-3 divide-y divide-line/60 border-t border-line/60">
        {detail.lines.map((line) => (
          <li key={line.id} className="flex flex-wrap justify-between gap-2 py-2 font-mono text-xs">
            <span className="text-muted">{line.sku}</span>
            <span className="text-ink">
              accepted {line.acceptedQuantity ?? '—'} / rejected {line.rejectedQuantity ?? '—'}
              {line.batchNumber ? ` · ${line.batchNumber}` : ''}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
