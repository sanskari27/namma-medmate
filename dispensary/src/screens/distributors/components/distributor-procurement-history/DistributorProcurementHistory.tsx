import type { BranchProcurement } from '@/services/suppliers';

export type DistributorProcurementHistoryProps = {
  procurement: BranchProcurement | null;
  outletName?: string | null;
};

export function DistributorProcurementHistory({
  procurement,
  outletName,
}: DistributorProcurementHistoryProps) {
  const branchName = procurement?.branchName || outletName || 'this outlet';
  const orders = procurement?.purchaseOrders ?? [];

  return (
    <section aria-label="This outlet purchase history" className="grid gap-2">
      <p className="font-mono text-[11px] tracking-wide text-muted">This outlet</p>
      <h2 className="text-sm font-medium text-ink">Purchase orders at {branchName}</h2>
      {orders.length === 0 ? (
        <p className="border border-line bg-canvas px-3 py-3 text-sm text-muted">
          No purchase orders from {branchName} yet. Orders stay on this outlet even though the
          supplier card is shared.
        </p>
      ) : (
        <ul className="divide-y divide-line border border-line">
          {orders.map((order) => (
            <li key={order.id} className="px-3 py-2 font-mono text-sm text-ink">
              {order.poNumber}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
