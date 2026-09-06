import type { OwnerDesk } from '@/services/dashboards';
import { ShopBooksStrip } from '../shop-books-strip';
import { ShopComplianceStrip } from '../shop-compliance-strip';
import { ShopMoversStrip } from '../shop-movers-strip';
import { ShopSalesStrip } from '../shop-sales-strip';
import { ShopStockStrip } from '../shop-stock-strip';
import { ShopWaitingStrip } from '../shop-waiting-strip';

export type ShopGlancePanelProps = {
  data: OwnerDesk | null | undefined;
};

export function ShopGlancePanel({ data }: ShopGlancePanelProps) {
  return (
    <div className="min-h-48 border border-line bg-line">
      <ShopSalesStrip widget={data?.sales} />
      <ShopStockStrip lowStock={data?.lowStock} expiry={data?.expiry} />
      <ShopWaitingStrip
        approvals={data?.approvals}
        transfers={data?.transfers}
        openPurchaseOrders={data?.openPurchaseOrders}
      />
      <ShopBooksStrip
        receivables={data?.receivables}
        payables={data?.payables}
        sources={data?.sources}
      />
      <ShopMoversStrip widget={data?.topProducts} />
      <ShopComplianceStrip widget={data?.compliance} />
    </div>
  );
}
