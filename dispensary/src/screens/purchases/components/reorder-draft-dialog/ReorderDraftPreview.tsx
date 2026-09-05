import type { ReorderDraftResult } from '@/services/purchaseOrders';
import { formatPaise, unmappedReasonLabel } from '../../PurchasesScreen.utils';

export function ReorderDraftPreview({ preview }: { preview: ReorderDraftResult }) {
  return (
    <>
      <section aria-label="Stockist split" className="grid gap-2">
        {preview.drafts.length === 0 ? (
          <p className="text-sm text-muted">No mapped packs to draft.</p>
        ) : (
          preview.drafts.map((draft, index) => (
            <article
              key={draft.supplierId + index}
              className="border border-line px-3 py-2 text-sm"
            >
              <p className="font-medium text-ink">{draft.supplierLegalName}</p>
              <p className="font-mono text-xs text-muted">
                {draft.lines.length} pack{draft.lines.length === 1 ? '' : 's'} ·{' '}
                {formatPaise(draft.totalPaise)}
              </p>
              <ul className="mt-1 text-xs text-muted">
                {draft.lines.map((line) => (
                  <li key={line.productId}>
                    {line.productName} × {String(line.quantity)}
                  </li>
                ))}
              </ul>
            </article>
          ))
        )}
      </section>
      {preview.unmapped.length > 0 ? (
        <section aria-label="Unmapped packs" className="grid gap-1">
          <h2 className="text-sm font-medium text-ink">Not on a stockist yet</h2>
          <ul className="border border-line text-sm">
            {preview.unmapped.map((line) => (
              <li key={line.productId} className="border-b border-line px-3 py-2 last:border-b-0">
                <p className="text-ink">{line.name}</p>
                <p className="text-xs text-muted">{unmappedReasonLabel(line.reason)}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
