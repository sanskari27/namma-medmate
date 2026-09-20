import type { HospitalWardStockItem } from '@/services/hospital';
import { HOSPITAL_BILLING_CONTENT } from '../../HospitalBillingScreen.content';
import { formatQty, formatRupees } from '../../HospitalBillingScreen.utils';

export function HospitalWardStockWorkspace({ items }: { items: HospitalWardStockItem[] }) {
  if (items.length === 0) {
    return (
      <p className="hb-empty" role="status">
        {HOSPITAL_BILLING_CONTENT.stockEmpty}
      </p>
    );
  }

  return (
    <section className="hb-panel" aria-label={HOSPITAL_BILLING_CONTENT.viewStock}>
      <div className="hb-table-wrap">
        <table className="hb-table">
          <caption className="sr-only">{HOSPITAL_BILLING_CONTENT.viewStock}</caption>
          <thead>
            <tr>
              <th scope="col">{HOSPITAL_BILLING_CONTENT.stockTableWard}</th>
              <th scope="col">{HOSPITAL_BILLING_CONTENT.stockTableMedicine}</th>
              <th scope="col">{HOSPITAL_BILLING_CONTENT.stockTableOnHand}</th>
              <th scope="col">{HOSPITAL_BILLING_CONTENT.tableCredit}</th>
              <th scope="col">{HOSPITAL_BILLING_CONTENT.stockTableValue}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.wardId}-${item.productId}`}>
                <td>{item.wardName}</td>
                <td>
                  <span className="block text-ink">{item.productName}</span>
                  <span className="font-mono text-[11px] text-muted">{item.sku}</span>
                </td>
                <td className="font-mono text-[12px]">{formatQty(item.quantity)}</td>
                <td className="font-mono text-[12px]">₹{formatRupees(item.creditPricePaise)}</td>
                <td className="font-mono text-[12px]">₹{formatRupees(item.valuePaise)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
