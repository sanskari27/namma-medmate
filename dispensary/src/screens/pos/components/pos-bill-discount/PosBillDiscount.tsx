import { Button, Input, Label } from '@atoms';
import type { DiscountType } from '@/services/salesInvoices';

interface PosBillDiscountProps {
  billType: DiscountType;
  billValue: string;
  customerGstin: string;
  onBillTypeChange: (value: DiscountType) => void;
  onBillValueChange: (value: string) => void;
  onCustomerGstinChange: (value: string) => void;
  onApply: () => void;
  disabled: boolean;
  busy: boolean;
}

export function PosBillDiscount({
  billType,
  billValue,
  customerGstin,
  onBillTypeChange,
  onBillValueChange,
  onCustomerGstinChange,
  onApply,
  disabled,
  busy,
}: PosBillDiscountProps) {
  const percent = billType === 'PERCENT';
  return (
    <section
      className="space-y-3 rounded border border-line bg-surface p-3"
      aria-label="Bill discount"
    >
      <h2 className="text-sm font-semibold text-ink">Bill discount</h2>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-1">
            <Label htmlFor="pos-bill-discount">
              {percent ? 'Bill discount %' : 'Bill discount ₹'}
            </Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={percent ? 'Use rupee bill discount' : 'Use percent bill discount'}
              onClick={() => onBillTypeChange(percent ? 'FLAT' : 'PERCENT')}
              disabled={busy}
            >
              {percent ? '₹' : '%'}
            </Button>
          </div>
          <Input
            id="pos-bill-discount"
            inputMode="decimal"
            value={billValue}
            onChange={(event) => onBillValueChange(event.target.value)}
            disabled={busy}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pos-customer-gstin">Customer GSTIN</Label>
          <Input
            id="pos-customer-gstin"
            className="font-mono"
            value={customerGstin}
            onChange={(event) => onCustomerGstinChange(event.target.value)}
            disabled={busy}
            autoCapitalize="characters"
          />
        </div>
      </div>
      <Button type="button" onClick={onApply} disabled={disabled || busy}>
        Apply on this bill
      </Button>
    </section>
  );
}
