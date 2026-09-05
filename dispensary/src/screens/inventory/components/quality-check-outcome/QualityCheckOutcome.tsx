import { formatIst, receiptQcLabel } from '../quality-check-workspace/QualityCheckWorkspace.utils';
import type { GoodsReceiptDetail } from '@/services/goodsReceipts';

export type QualityCheckOutcomeProps = {
  detail: GoodsReceiptDetail;
};

export function QualityCheckOutcome({ detail }: QualityCheckOutcomeProps) {
  return (
    <section
      className="border border-line bg-surface p-3 text-sm text-ink"
      aria-label="Check outcome"
    >
      <p className="font-medium">{receiptQcLabel(detail.status)}</p>
      {detail.checkedAt ? (
        <p className="mt-1 text-muted">Checked {formatIst(detail.checkedAt)}</p>
      ) : null}
      {detail.lines.map((line) => (
        <p key={line.id} className="mt-2 font-mono text-xs text-muted">
          {line.sku}: accepted {line.acceptedQuantity ?? '—'} / rejected{' '}
          {line.rejectedQuantity ?? '—'}
          {line.batchNumber ? ` batch ${line.batchNumber}` : ''}
        </p>
      ))}
    </section>
  );
}
