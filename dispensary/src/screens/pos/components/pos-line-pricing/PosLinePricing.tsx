import { Input, Label } from '@atoms';

interface PosLinePricingProps {
  productId: string;
  productName: string;
  mrpRupees: string;
  sellingRupees: string;
  discountRupees: string;
  onMrpChange: (value: string) => void;
  onSellingChange: (value: string) => void;
  onDiscountChange: (value: string) => void;
  busy: boolean;
}

export function PosLinePricing({
  productId,
  productName,
  mrpRupees,
  sellingRupees,
  discountRupees,
  onMrpChange,
  onSellingChange,
  onDiscountChange,
  busy,
}: PosLinePricingProps) {
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
        <Label htmlFor={`pos-disc-${productId}`}>Discount ₹</Label>
        <Input
          id={`pos-disc-${productId}`}
          inputMode="decimal"
          value={discountRupees}
          onChange={(event) => onDiscountChange(event.target.value)}
          disabled={busy}
        />
      </div>
    </div>
  );
}
