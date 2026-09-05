import type { GoodsReceiptSummary } from '@/services/goodsReceipts';
import { formatIst, receiptQcLabel } from '../quality-check-workspace/QualityCheckWorkspace.utils';

export type QualityCheckListProps = {
  items: GoodsReceiptSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function QualityCheckList({ items, selectedId, onSelect }: QualityCheckListProps) {
  return (
    <section
      className="min-h-0 overflow-auto border border-line bg-surface"
      aria-label="Pending deliveries"
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
              <span className="font-mono text-ink">{row.receiptNumber}</span>
              <span className="text-muted">{row.receiptReference}</span>
              <span className="text-muted">{row.supplierLegalName}</span>
              <span className="text-xs text-muted">{formatIst(row.createdAt)}</span>
              <span className="text-xs text-ink">{receiptQcLabel(row.status)}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
