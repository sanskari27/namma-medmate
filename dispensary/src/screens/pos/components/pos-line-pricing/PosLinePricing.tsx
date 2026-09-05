import { Button, Input, Label } from '@atoms';
import type { DiscountType } from '@/services/salesInvoices';

interface PosLinePricingProps {
  productId: string;
  productName: string;
  mrpRupees: string;
  sellingRupees: string;
  discountValue: string;
  discountType: DiscountType;
  onMrpChange: (value: string) => void;
  onSellingChange: (value: string) => void;
  onDiscountChange: (value: string) => void;
  onDiscountTypeChange: (value: DiscountType) => void;
  busy: boolean;
}

export function PosLinePricing({
  productId,
  productName,
  mrpRupees,
  sellingRupees,
  discountValue,
  discountType,
  onMrpChange,
  onSellingChange,
  onDiscountChange,
  onDiscountTypeChange,
  busy,
}: PosLinePricingProps) {
  const percent = discountType === 'PERCENT';
  return (
    <div className="grid grid-cols-3 gap-2" aria-label={`${productName} price`}>
      <div className="space-y-1">
        <Label htmlFor={`pos-mrp-${productId}`}>MRP ₹</Label>
        <Input
          id={`pos-mrp-${productId}`}
          inputMode="decimal"
          value={mrpRupees}
          onChange={(event) => onMrpChange(event.target.value)}
          disabled={busy}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`pos-sell-${productId}`}>Selling ₹</Label>
        <Input
          id={`pos-sell-${productId}`}
          inputMode="decimal"
          value={sellingRupees}
          onChange={(event) => onSellingChange(event.target.value)}
          disabled={busy}
        />
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-1">
          <Label htmlFor={`pos-disc-${productId}`}>{percent ? 'Discount %' : 'Discount ₹'}</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={
              percent
                ? `Use rupee discount for ${productName}`
                : `Use percent discount for ${productName}`
            }
            onClick={() => onDiscountTypeChange(percent ? 'FLAT' : 'PERCENT')}
            disabled={busy}
          >
            {percent ? '₹' : '%'}
          </Button>
        </div>
        <Input
          id={`pos-disc-${productId}`}
          inputMode="decimal"
          value={discountValue}
          onChange={(event) => onDiscountChange(event.target.value)}
          disabled={busy}
        />
      </div>
    </div>
  );
}
