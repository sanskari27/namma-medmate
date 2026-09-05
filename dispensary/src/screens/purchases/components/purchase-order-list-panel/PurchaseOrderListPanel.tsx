import { Input, Label } from '@atoms';
import type { PurchaseOrder } from '@/services/purchaseOrders';
import { Search } from 'lucide-react';
import { PurchaseOrderListRow } from '../purchase-order-list-row';

export type PurchaseOrderListPanelProps = {
  formId: string;
  orders: PurchaseOrder[];
  selectedId: string | null;
  query: string;
  showEmptyHint: boolean;
  onQueryChange: (value: string) => void;
  onSelect: (order: PurchaseOrder) => void;
};

export function PurchaseOrderListPanel({
  formId,
  orders,
  selectedId,
  query,
  showEmptyHint,
  onQueryChange,
  onSelect,
}: PurchaseOrderListPanelProps) {
  const filtered = query.trim()
    ? orders.filter((order) => {
        const q = query.trim().toLowerCase();
        return (
          order.poNumber.toLowerCase().includes(q) ||
          order.supplierLegalName.toLowerCase().includes(q)
        );
      })
    : orders;

  return (
    <section
      aria-label="Purchase order list"
      className="flex h-full min-h-0 flex-col border border-line bg-surface"
    >
      <div className="flex items-center gap-2 border-b border-line px-3 py-2">
        <Label htmlFor={`${formId}-search`} className="sr-only">
          Search indents
        </Label>
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <Input
            id={`${formId}-search`}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="PO number or stockist"
            className="h-9 pl-8 font-mono text-sm"
          />
        </div>
      </div>
      <ul className="panel-scroll min-h-0 flex-1 divide-y divide-line overflow-y-auto">
        {filtered.map((order) => (
          <PurchaseOrderListRow
            key={order.id}
            order={order}
            active={selectedId === order.id}
            nameId={`${formId}-row-${order.id}-name`}
            metaId={`${formId}-row-${order.id}-meta`}
            onSelect={onSelect}
          />
        ))}
      </ul>
      {showEmptyHint ? (
        <p className="border-t border-line px-3 py-6 text-sm text-muted">
          No matching indents on this outlet.
        </p>
      ) : null}
    </section>
  );
}
