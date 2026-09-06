import type {
  CountItemsPayload,
  DashboardWidget,
  TransferItem,
  WorkItem,
} from '@/services/dashboards';
import { ShopWidgetFrame } from '../shop-widget-frame';

export type ShopWaitingStripProps = {
  approvals?: DashboardWidget<CountItemsPayload<WorkItem>> | null;
  transfers?: DashboardWidget<CountItemsPayload<TransferItem>> | null;
  openPurchaseOrders?: DashboardWidget<CountItemsPayload<WorkItem>> | null;
};

function workList(items: WorkItem[], empty: string) {
  if (items.length === 0) {
    return <p className="mt-2 text-sm text-muted">{empty}</p>;
  }
  return (
    <ul className="mt-2 space-y-1 text-sm">
      {items.map((row) => (
        <li key={row.id} className="flex justify-between gap-3 text-ink">
          <span>{row.label}</span>
          <span className="font-mono text-xs text-muted">{row.status}</span>
        </li>
      ))}
    </ul>
  );
}

export function ShopWaitingStrip({
  approvals,
  transfers,
  openPurchaseOrders,
}: ShopWaitingStripProps) {
  const waitingTransfers = transfers?.data?.items ?? [];
  return (
    <>
      <ShopWidgetFrame
        title="Waiting sign-off"
        asOf={approvals?.asOf}
        status={approvals?.status}
        href={approvals?.href ?? '/approvals/pending'}
        linkLabel="Waiting sign-off"
      >
        {workList(approvals?.data?.items ?? [], 'No approvals waiting.')}
      </ShopWidgetFrame>
      <ShopWidgetFrame
        title="Waiting transfers"
        asOf={transfers?.asOf}
        status={transfers?.status}
        href={transfers?.href ?? '/inventory'}
        linkLabel="Waiting transfers"
      >
        {waitingTransfers.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No requested or in-transit moves.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {waitingTransfers.map((row) => (
              <li key={row.id} className="flex justify-between gap-3 font-mono text-ink">
                <span>{row.status}</span>
                <span className="text-muted">{row.direction}</span>
              </li>
            ))}
          </ul>
        )}
      </ShopWidgetFrame>
      <ShopWidgetFrame
        title="Open orders"
        asOf={openPurchaseOrders?.asOf}
        status={openPurchaseOrders?.status}
        href={openPurchaseOrders?.href ?? '/purchases'}
        linkLabel="Outlet orders"
      >
        {workList(openPurchaseOrders?.data?.items ?? [], 'No draft or issued indents.')}
      </ShopWidgetFrame>
    </>
  );
}
