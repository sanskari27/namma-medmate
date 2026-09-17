import { useEffect, useState } from 'react';
import { listDueRefills, formatDueDate, type DueRefill } from '@/services/customerRefills';

export function PosDueRefills() {
  const [items, setItems] = useState<DueRefill[]>([]);

  useEffect(() => {
    let dead = false;
    void listDueRefills()
      .then((rows) => {
        if (!dead) setItems(rows);
      })
      .catch(() => {
        if (!dead) setItems([]);
      });
    return () => {
      dead = true;
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="border border-line bg-surface px-3 py-2 text-sm" aria-label="Due refills">
      <p className="font-mono text-[11px] tracking-wide text-muted">Due refills ({items.length})</p>
      <ul className="mt-1 grid gap-0.5">
        {items.slice(0, 3).map((row) => (
          <li key={row.refillId} className="flex flex-wrap justify-between gap-2 text-ink">
            <span>
              {row.customerName}{' '}
              <span className="text-muted">{row.medicineName}</span>
            </span>
            <span className="font-mono text-xs text-muted">{formatDueDate(row.nextDueOn)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
