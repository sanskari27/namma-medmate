import { Label } from '@atoms';
import type { CustomerHistoryItem } from '@/services/customers';
import { Receipt } from 'lucide-react';
import { useId } from 'react';

export type CustomerPurchaseHistoryProps = {
  items: CustomerHistoryItem[];
  loading: boolean;
  typeFilter: string;
  onTypeFilter: (value: string) => void;
};

const selectClassName =
  'h-9 w-full border border-line bg-surface px-2.5 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand';

function formatIst(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function formatPaise(paise: number | null): string | null {
  if (paise == null) {
    return null;
  }
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

export function CustomerPurchaseHistory({
  items,
  loading,
  typeFilter,
  onTypeFilter,
}: CustomerPurchaseHistoryProps) {
  const formId = useId();
  const filtered = typeFilter ? items.filter((row) => row.type === typeFilter) : items;

  return (
    <div className="grid gap-3 border-t border-line pt-4" aria-label="Purchase history">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="size-3.5 shrink-0 text-brand" aria-hidden />
            <p className="font-mono text-[11px] tracking-wide text-muted">Purchase & Rx history</p>
          </div>
          <p className="mt-1 text-sm text-muted">
            Sales and prescription references posted from the till.
          </p>
        </div>
        <div className="grid w-full max-w-[11rem] gap-1">
          <Label htmlFor={`${formId}-type`} className="text-xs text-muted">
            Type
          </Label>
          <select
            id={`${formId}-type`}
            className={selectClassName}
            value={typeFilter}
            onChange={(event) => onTypeFilter(event.target.value)}
          >
            <option value="">All types</option>
            <option value="PURCHASE">Purchase</option>
            <option value="PRESCRIPTION">Prescription</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted" role="status">
          Loading history…
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted">
          No purchase or prescription history on this profile yet.
        </p>
      ) : (
        <ul className="grid gap-2">
          {filtered.map((item) => {
            const amount = formatPaise(item.amountPaise);
            return (
              <li key={item.id} className="grid gap-0.5 border border-line bg-canvas/40 px-3 py-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-mono text-[11px] tracking-wide text-brand">{item.type}</p>
                  <p className="font-mono text-[11px] tabular-nums text-muted">
                    {formatIst(item.occurredAt)} IST
                  </p>
                </div>
                <p className="text-sm font-medium text-ink">{item.summary}</p>
                <p className="text-xs text-muted">
                  {item.prescriptionReference
                    ? `Rx ${item.prescriptionReference}`
                    : 'No Rx reference'}
                  {item.doctorName ? ` · ${item.doctorName}` : ''}
                  {amount ? ` · ${amount}` : ''}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
