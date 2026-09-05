import { Button } from '@atoms';
import type { PurchaseOrder } from '@/services/purchaseOrders';
import { useState } from 'react';
import { formatPaise } from '../../PurchasesScreen.utils';

export type BulkIndentBarProps = {
  drafts: PurchaseOrder[];
  busy: boolean;
  onIssue: (items: Array<{ id: string; expectedVersion: number }>) => void;
};

export function BulkIndentBar({ drafts, busy, onIssue }: BulkIndentBarProps) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const chosen = drafts.filter((row) => selected[row.id]);

  if (drafts.length === 0) {
    return (
      <section aria-label="Bulk indent actions" className="border border-line bg-surface px-3 py-2">
        <p className="text-sm text-muted">No draft indents to issue in bulk.</p>
      </section>
    );
  }

  return (
    <section aria-label="Bulk indent actions" className="border border-line bg-surface px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink">Issue selected drafts</p>
        <Button
          type="button"
          size="sm"
          disabled={busy || chosen.length === 0}
          onClick={() =>
            onIssue(chosen.map((row) => ({ id: row.id, expectedVersion: row.version })))
          }
        >
          {busy ? 'Issuing…' : 'Issue selected'}
        </Button>
      </div>
      <ul className="mt-2 grid gap-1">
        {drafts.map((row) => (
          <li key={row.id}>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={Boolean(selected[row.id])}
                onChange={(event) =>
                  setSelected((prev) => ({ ...prev, [row.id]: event.target.checked }))
                }
                aria-label={`Select ${row.poNumber}`}
              />
              <span className="font-mono">{row.poNumber}</span>
              <span className="text-muted">
                {row.supplierLegalName} · {formatPaise(row.totalPaise)}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
