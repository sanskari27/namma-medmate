import { IndianRupee, FileText, Truck } from 'lucide-react';
import { useSelector } from 'react-redux';
import { PURCHASES_CONTENT } from '../../PurchasesScreen.content';
import { formatPaise } from '../../PurchasesScreen.utils';
import { selectPurchasesSummary } from '../../store/purchases.selectors';

export function PurchasesSummary() {
  const stats = useSelector(selectPurchasesSummary);

  return (
    <div className="purchases-kpis" aria-label="Purchases summary">
      <div className="purchases-kpi">
        <div className="purchases-kpi-ico" data-tone="green" aria-hidden>
          <IndianRupee size={18} />
        </div>
        <div>
          <div className="k">{PURCHASES_CONTENT.summary.monthSpend}</div>
          <div className="v">{formatPaise(stats.monthSpendPaise)}</div>
          <div className="h">{PURCHASES_CONTENT.summary.monthSpendHint(stats.monthBillCount)}</div>
        </div>
      </div>
      <div className="purchases-kpi">
        <div className="purchases-kpi-ico" data-tone="blue" aria-hidden>
          <FileText size={18} />
        </div>
        <div>
          <div className="k">{PURCHASES_CONTENT.summary.gstCredit}</div>
          <div className="v">{formatPaise(stats.monthGstPaise)}</div>
          <div className="h">{PURCHASES_CONTENT.summary.gstCreditHint}</div>
        </div>
      </div>
      <div className="purchases-kpi">
        <div className="purchases-kpi-ico" data-tone="orange" aria-hidden>
          <Truck size={18} />
        </div>
        <div>
          <div className="k">{PURCHASES_CONTENT.summary.grnCount}</div>
          <div className="v">{stats.totalGrns}</div>
          <div className="h">{PURCHASES_CONTENT.summary.grnCountHint}</div>
        </div>
      </div>
    </div>
  );
}
