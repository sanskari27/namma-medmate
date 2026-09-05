import type { PurchaseOrder } from '@/services/purchaseOrders';
import { formatPaise, statusLabel } from '../../PurchasesScreen.utils';

export type PurchaseOrderListRowProps = {
  order: PurchaseOrder;
  active: boolean;
  nameId: string;
  metaId: string;
  onSelect: (order: PurchaseOrder) => void;
};

export function PurchaseOrderListRow({
  order,
  active,
  nameId,
  metaId,
  onSelect,
}: PurchaseOrderListRowProps) {
  return (
    <li className="flex items-stretch">
      <span
        className={`w-1 shrink-0 ${order.status === 'DRAFT' || order.status === 'ISSUED' ? 'bg-brand' : 'bg-muted'}`}
        aria-hidden
      />
      <button
        type="button"
        aria-labelledby={nameId}
        aria-describedby={metaId}
        className={`flex min-w-0 flex-1 cursor-pointer flex-col gap-0.5 px-3 py-2.5 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus ${
          active ? 'bg-brand-soft' : 'hover:bg-canvas/80'
        }`}
        onClick={() => onSelect(order)}
        aria-current={active ? 'true' : undefined}
      >
        <span id={nameId} className="truncate font-mono text-sm text-ink">
          {order.poNumber}
        </span>
        <span id={metaId} className="text-xs text-muted">
          {order.supplierLegalName} · {statusLabel(order.status)} · {formatPaise(order.totalPaise)}
        </span>
      </button>
    </li>
  );
}
