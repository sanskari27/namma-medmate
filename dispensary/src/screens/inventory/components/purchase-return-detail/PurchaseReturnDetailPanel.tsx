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
    <section className="grid gap-4" aria-label="Debit note">
      <div className="grid gap-1 sm:grid-cols-2">
        <div>
          <p className="text-xs text-muted">Debit note</p>
          <p className="font-mono text-base font-semibold text-ink">{detail.debitNoteNumber}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Amount</p>
          <p className="font-mono text-base font-semibold text-ink">
            {formatPaise(detail.amountPaise)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">Stockist</p>
          <p className="text-sm text-ink">{detail.supplierLegalName}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Origin</p>
          <p className="text-sm text-ink">{originLabel(detail.origin)}</p>
        </div>
        <div className="sm:col-span-2">
          <p className="text-xs text-muted">Confirmed</p>
          <p className="text-sm text-ink">{formatIst(detail.createdAt)}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-line/70">
        <table className="w-full text-left text-sm">
          <thead className="bg-brand-soft/60 text-[11px] uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-2 font-semibold">Product</th>
              <th className="px-3 py-2 font-semibold">SKU</th>
              <th className="px-3 py-2 font-semibold">Qty</th>
              <th className="px-3 py-2 font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {detail.lines.map((line) => (
              <tr key={line.id} className="border-t border-line/60">
                <td className="px-3 py-2.5 font-medium text-ink">{line.productName}</td>
                <td className="px-3 py-2.5 font-mono text-xs text-muted">{line.sku}</td>
                <td className="px-3 py-2.5 font-mono text-ink">{line.quantity}</td>
                <td className="px-3 py-2.5 font-mono text-ink">
                  {formatPaise(line.amountPaise)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
