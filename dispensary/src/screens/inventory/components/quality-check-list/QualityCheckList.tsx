import type { GoodsReceiptSummary } from '@/services/goodsReceipts';
import { PackageCheck } from 'lucide-react';
import { formatIst, receiptQcLabel } from '../quality-check-workspace/QualityCheckWorkspace.utils';

export type QualityCheckListProps = {
  items: GoodsReceiptSummary[];
  selectedId: string | null;
  query: string;
  onSelect: (id: string) => void;
};

export function QualityCheckList({ items, selectedId, query, onSelect }: QualityCheckListProps) {
  const q = query.trim().toLowerCase();
  const filtered = q
    ? items.filter((row) =>
        [row.receiptNumber, row.receiptReference, row.supplierLegalName]
          .join(' ')
          .toLowerCase()
          .includes(q),
      )
    : items;

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
        <PackageCheck className="size-8 text-muted" aria-hidden />
        <p className="text-sm text-muted">
          {items.length === 0
            ? 'No deliveries waiting for a pharmacist check.'
            : 'No deliveries match this search.'}
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-line/60" aria-label="Pending deliveries">
      {filtered.map((row) => {
        const active = selectedId === row.id;
        return (
          <li key={row.id}>
            <button
              type="button"
              className={`grid w-full gap-1 px-4 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand ${
                active ? 'bg-brand-soft' : 'bg-surface hover:bg-brand-soft/40'
              }`}
              onClick={() => onSelect(row.id)}
              aria-current={active ? 'true' : undefined}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-mono text-sm font-medium text-ink">{row.receiptNumber}</span>
                <span className="shrink-0 rounded-full border border-warn/40 bg-[#fff1e6] px-2 py-0.5 text-[11px] font-medium text-warn">
                  {receiptQcLabel(row.status)}
                </span>
              </div>
              <span className="truncate text-sm text-ink">{row.supplierLegalName}</span>
              <span className="truncate text-xs text-muted">{row.receiptReference}</span>
              <span className="text-xs text-muted">{formatIst(row.createdAt)}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
