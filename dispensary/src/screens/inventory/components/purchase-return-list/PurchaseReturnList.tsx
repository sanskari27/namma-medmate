import type { PurchaseReturnSummary } from '@/services/purchaseReturns';
import {
  formatIst,
  formatPaise,
  originLabel,
} from '../purchase-return-workspace/PurchaseReturnWorkspace.utils';

export type PurchaseReturnListProps = {
  items: PurchaseReturnSummary[];
  selectedId: string | null;
  query: string;
  onSelect: (id: string) => void;
};

export function PurchaseReturnList({
  items,
  selectedId,
  query,
  onSelect,
}: PurchaseReturnListProps) {
  const q = query.trim().toLowerCase();
  const filtered = q
    ? items.filter((row) =>
        [row.debitNoteNumber, row.supplierLegalName, originLabel(row.origin)]
          .join(' ')
          .toLowerCase()
          .includes(q),
      )
    : items;

  if (filtered.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-sm text-muted">
        {items.length === 0
          ? 'No debit notes yet. Send a pack back, or reject qty at Quality check.'
          : 'No debit notes match this search.'}
      </p>
    );
  }

  return (
    <div className="overflow-auto">
      <table className="w-full min-w-[40rem] border-collapse text-left">
        <thead className="sticky top-0 z-10 bg-brand-soft/80 backdrop-blur-sm">
          <tr>
            {['Debit note', 'Stockist', 'Origin', 'Amount', 'Confirmed'].map((label) => (
              <th
                key={label}
                className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.map((row) => {
            const active = selectedId === row.id;
            return (
              <tr
                key={row.id}
                className={`cursor-pointer border-b border-line/60 last:border-0 ${
                  active ? 'bg-brand-soft' : 'hover:bg-brand-soft/40'
                }`}
                onClick={() => onSelect(row.id)}
                aria-selected={active}
              >
                <td className="px-3 py-3 font-mono text-sm font-medium text-ink">
                  {row.debitNoteNumber}
                </td>
                <td className="px-3 py-3 text-sm text-ink">{row.supplierLegalName}</td>
                <td className="px-3 py-3">
                  <span className="inline-flex rounded-full border border-line bg-canvas px-2 py-0.5 text-xs text-muted">
                    {originLabel(row.origin)}
                  </span>
                </td>
                <td className="px-3 py-3 font-mono text-sm text-ink">
                  {formatPaise(row.amountPaise)}
                </td>
                <td className="px-3 py-3 text-xs text-muted">{formatIst(row.createdAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
