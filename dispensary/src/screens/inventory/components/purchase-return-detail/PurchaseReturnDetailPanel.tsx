import type { PurchaseReturnDetail } from '@/services/purchaseReturns';
import {
  formatIst,
  formatPaise,
  originLabel,
} from '../purchase-return-workspace/PurchaseReturnWorkspace.utils';

export type PurchaseReturnDetailPanelProps = {
  detail: PurchaseReturnDetail;
};

export function PurchaseReturnDetailPanel({ detail }: PurchaseReturnDetailPanelProps) {
  return (
    <section
      className="min-h-0 overflow-auto border border-line bg-surface p-3"
      aria-label="Debit note"
    >
      <p className="font-mono text-sm text-ink">{detail.debitNoteNumber}</p>
      <p className="text-sm text-muted">{detail.supplierLegalName}</p>
      <p className="mt-1 text-sm text-ink">{originLabel(detail.origin)}</p>
      <p className="font-mono text-sm text-ink">{formatPaise(detail.amountPaise)}</p>
      <p className="text-xs text-muted">Confirmed {formatIst(detail.createdAt)}</p>
      <ul className="mt-3 divide-y divide-line border-t border-line">
        {detail.lines.map((line) => (
          <li key={line.id} className="grid gap-0.5 py-2 text-sm">
            <span className="text-ink">{line.productName}</span>
            <span className="font-mono text-xs text-muted">{line.sku}</span>
            <span className="text-muted">
              Qty {line.quantity} · {formatPaise(line.amountPaise)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
