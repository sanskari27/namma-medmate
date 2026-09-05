import type { PurchaseOrder, PurchaseOrderAnalytics } from '@/services/purchaseOrders';
import { BulkIndentBar } from '../bulk-indent-bar';
import { StockistSpendPanel } from '../stockist-spend-panel';

type SpendStatus = 'loading' | 'empty' | 'denied' | 'failure' | null;

export function PurchasesProStrip({
  drafts,
  busy,
  analytics,
  spendStatus,
  onIssue,
}: {
  drafts: PurchaseOrder[];
  busy: boolean;
  analytics: PurchaseOrderAnalytics | null;
  spendStatus: SpendStatus;
  onIssue: (items: Array<{ id: string; expectedVersion: number }>) => void;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <BulkIndentBar drafts={drafts} busy={busy} onIssue={onIssue} />
      <StockistSpendPanel analytics={analytics} status={spendStatus} />
    </div>
  );
}
