import { Input, Label } from '@atoms';
import type { HospitalProductPrice } from '@/services/hospital';
import { HOSPITAL_BILLING_CONTENT } from '../../HospitalBillingScreen.content';
import { bpsToPercent, formatRupees } from '../../HospitalBillingScreen.utils';

export function HospitalPriceListPanel({
  uniformPercent,
  items,
  disabled,
  onUniformPercent,
}: {
  uniformPercent: string;
  items: HospitalProductPrice[];
  disabled: boolean;
  onUniformPercent: (value: string) => void;
}) {
  return (
    <section className="hb-panel" aria-labelledby="hb-price-list-title">
      <h2 id="hb-price-list-title" className="font-serif text-base text-ink">
        {HOSPITAL_BILLING_CONTENT.priceListTitle}
      </h2>
      <div className="mt-3 space-y-1.5">
        <Label htmlFor="hb-uniform">{HOSPITAL_BILLING_CONTENT.uniformDiscountLabel}</Label>
        <Input
          id="hb-uniform"
          inputMode="decimal"
          value={uniformPercent}
          disabled={disabled}
          onChange={(event) => onUniformPercent(event.target.value)}
        />
      </div>
      <div className="hb-table-wrap mt-4">
        <table className="hb-table">
          <caption className="sr-only">Hospital credit prices</caption>
          <thead>
            <tr>
              <th scope="col">Product</th>
              <th scope="col">{HOSPITAL_BILLING_CONTENT.tableMrp}</th>
              <th scope="col">{HOSPITAL_BILLING_CONTENT.tableCredit}</th>
              <th scope="col">{HOSPITAL_BILLING_CONTENT.tableDiscount}</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-muted">
                  No products with MRP yet. Add MRP on products to build credit prices.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.productId}>
                  <td>
                    <span className="block text-ink">{item.productName}</span>
                    <span className="font-mono text-[11px] text-muted">{item.sku}</span>
                  </td>
                  <td className="font-mono text-[12px]">₹{formatRupees(item.mrpPaise)}</td>
                  <td className="font-mono text-[12px]">₹{formatRupees(item.creditPricePaise)}</td>
                  <td className="font-mono text-[12px]">{bpsToPercent(item.effectiveDiscountBps)}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
