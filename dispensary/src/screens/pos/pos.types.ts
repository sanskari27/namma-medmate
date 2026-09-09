import type { StockBatchDetail } from '@/services/inventory';
import type { Product, ProductUnit } from '@/services/products';
import type { DiscountType } from '@/services/salesInvoices';

export type PageStatus =
  | 'loading'
  | 'empty'
  | 'validation'
  | 'denied'
  | 'conflict'
  | 'failure'
  | 'success'
  | null;

export type PosDraftLine = {
  id: string;
  product: Product;
  unit: ProductUnit;
  quantity: string;
  baseQuantity: number | null;
  unitOptions: ProductUnit[];
  /** factorToBase per unit (base unit = 1); used for pack/loose/box pricing. */
  unitFactors: Partial<Record<ProductUnit, number>>;
  batches: StockBatchDetail[];
  batchId: string | null;
  nearExpiry: boolean;
  mrpRupees: string;
  sellingRupees: string;
  discountRupees: string;
  discountType: DiscountType;
  prescribedQuantity: string;
};
