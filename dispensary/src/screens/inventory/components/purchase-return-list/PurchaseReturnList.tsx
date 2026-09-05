import type { PurchaseReturnSummary } from '@/services/purchaseReturns';
import {
  formatIst,
  formatPaise,
  originLabel,
} from '../purchase-return-workspace/PurchaseReturnWorkspace.utils';

export type PurchaseReturnListProps = {
  items: PurchaseReturnSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function PurchaseReturnList({ items, selectedId, onSelect }: PurchaseReturnListProps) {
  return (
    <section
      className="min-h-0 overflow-auto border border-line bg-surface"
      aria-label="Debit notes"
    >
      <ul className="divide-y divide-line">
        {items.map((row) => (
          <li key={row.id}>
            <button
              type="button"
              className={`grid w-full gap-0.5 px-3 py-2 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                selectedId === row.id ? 'bg-brand-soft' : 'bg-surface'
              }`}
              onClick={() => onSelect(row.id)}
            >
              <span className="font-mono text-ink">{row.debitNoteNumber}</span>
              <span className="text-muted">{row.supplierLegalName}</span>
              <span className="text-xs text-muted">{originLabel(row.origin)}</span>
              <span className="font-mono text-xs text-ink">{formatPaise(row.amountPaise)}</span>
              <span className="text-xs text-muted">{formatIst(row.createdAt)}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
