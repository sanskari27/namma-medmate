import type { Product } from '@/services/products';
import type { Supplier } from '@/services/suppliers';
import type {
  PurchaseOrder,
  PurchaseOrderLineInput,
  PurchaseOrderStatus,
  PurchaseOrderVersion,
  PurchasePaymentTerms,
} from '@/services/purchaseOrders';
import { AlertCircle, BadgeCheck, ClipboardList, Unplug } from 'lucide-react';

export type PageStatus =
  'loading' | 'empty' | 'validation' | 'denied' | 'conflict' | 'failure' | 'success' | null;

export type LineForm = {
  productId: string;
  quantity: string;
  rateRupees: string;
};

export type FormState = {
  supplierId: string;
  expectedDeliveryDate: string;
  paymentTerms: PurchasePaymentTerms;
  notes: string;
  lines: LineForm[];
};

export const emptyLine: LineForm = { productId: '', quantity: '', rateRupees: '' };

export const emptyForm: FormState = {
  supplierId: '',
  expectedDeliveryDate: '',
  paymentTerms: 'CREDIT',
  notes: '',
  lines: [{ ...emptyLine }],
};

export const PAYMENT_TERMS: PurchasePaymentTerms[] = ['COD', 'ADVANCE', 'CREDIT'];

export function hasPurchaseAccess(modules: string[] | undefined): boolean {
  return modules?.includes('PROCUREMENT') === true;
}

export function canDraftFromReorder(planCode: string | null | undefined): boolean {
  return planCode === 'GROWTH' || planCode === 'PRO';
}

export function isProPlan(planCode: string | null | undefined): boolean {
  return planCode === 'PRO';
}

export function unmappedReasonLabel(reason: string): string {
  switch (reason) {
    case 'AMBIGUOUS':
      return 'More than one stockist covers this pack';
    case 'NO_RATE':
      return 'No last rate on file';
    case 'PRODUCT_INACTIVE':
      return 'Pack is off the shelf list';
    case 'SUPPLIER_INACTIVE':
      return 'Stockist is inactive';
    case 'ZERO_QTY':
      return 'Suggested qty is zero';
    default:
      return 'No stockist mapped';
  }
}

export function statusLabel(status: PurchaseOrderStatus): string {
  switch (status) {
    case 'DRAFT':
      return 'Draft';
    case 'ISSUED':
      return 'Issued';
    case 'CLOSED':
      return 'Closed';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return status;
  }
}

export function termsLabel(terms: PurchasePaymentTerms): string {
  switch (terms) {
    case 'COD':
      return 'Cash on delivery';
    case 'ADVANCE':
      return 'Advance';
    case 'CREDIT':
      return 'Credit days';
    default:
      return terms;
  }
}

export function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

export function canEdit(status: PurchaseOrderStatus | undefined): boolean {
  return status === 'DRAFT' || status === 'ISSUED';
}

export function validateForm(form: FormState): boolean {
  if (!form.supplierId) {
    return false;
  }
  return form.lines.some(
    (line) => line.productId && Number(line.quantity) > 0 && Number(line.rateRupees) > 0,
  );
}

export function toLineInputs(form: FormState): PurchaseOrderLineInput[] {
  return form.lines
    .filter((line) => line.productId && Number(line.quantity) > 0 && Number(line.rateRupees) > 0)
    .map((line) => ({
      productId: line.productId,
      quantity: Number(line.quantity),
      unitRatePaise: Math.round(Number(line.rateRupees) * 100),
    }));
}

export function toForm(order: PurchaseOrder): FormState {
  return {
    supplierId: order.supplierId,
    expectedDeliveryDate: order.expectedDeliveryDate ?? '',
    paymentTerms: order.paymentTerms,
    notes: order.notes ?? '',
    lines:
      order.lines.length === 0
        ? [{ ...emptyLine }]
        : order.lines.map((line) => ({
            productId: line.productId,
            quantity: String(line.quantity),
            rateRupees: String(line.unitRatePaise / 100),
          })),
  };
}

export function statusCopy(status: PageStatus): { icon: typeof AlertCircle; text: string } | null {
  switch (status) {
    case 'loading':
      return { icon: ClipboardList, text: 'Loading purchase orders for this outlet…' };
    case 'empty':
      return {
        icon: ClipboardList,
        text: 'No indents on this outlet yet. Start one for a single stockist.',
      };
    case 'validation':
      return {
        icon: AlertCircle,
        text: 'Pick one stockist and at least one pack with quantity and agreed rate.',
      };
    case 'denied':
      return {
        icon: AlertCircle,
        text: 'This till login cannot place purchase orders. Ask the owner to grant Purchases.',
      };
    case 'conflict':
      return {
        icon: AlertCircle,
        text: 'Reorder numbers moved, or someone else saved this indent. Reload and try again.',
      };
    case 'failure':
      return { icon: Unplug, text: 'Could not reach the server for purchase orders. Try again.' };
    case 'success':
      return { icon: BadgeCheck, text: 'Outlet indent saved. Totals and version updated.' };
    default:
      return null;
  }
}

export function statusIconClass(status: PageStatus): string {
  if (status === 'success') {
    return 'text-brand';
  }
  if (status === 'conflict' || status === 'validation') {
    return 'text-warn';
  }
  if (status === 'failure' || status === 'denied') {
    return 'text-danger';
  }
  return 'text-brand';
}

export function mapApiStatus(error: { status: number; code: string | null }): PageStatus {
  if (error.status === 403 || error.code === 'FORBIDDEN') {
    return 'denied';
  }
  if (error.code === 'PLAN_LIMIT') {
    return 'denied';
  }
  if (error.status === 409 || error.code === 'STALE_STATE') {
    return 'conflict';
  }
  if (
    error.status === 400 ||
    error.status === 422 ||
    error.code === 'VALIDATION_ERROR' ||
    error.code === 'MIXED_SUPPLIER' ||
    error.code === 'SUPPLIER_INACTIVE' ||
    error.code === 'PRODUCT_INACTIVE' ||
    error.code === 'INVALID_QUANTITY' ||
    error.code === 'PO_CLOSED' ||
    error.code === 'REORDER_EMPTY'
  ) {
    return 'validation';
  }
  return 'failure';
}

export type VersionDiffRow = {
  productName: string;
  leftQty: string;
  rightQty: string;
  leftTotal: string;
  rightTotal: string;
  changed: boolean;
};

export function compareVersions(
  left: PurchaseOrderVersion | null,
  right: PurchaseOrderVersion | null,
): VersionDiffRow[] {
  if (!left || !right) {
    return [];
  }
  const leftLines = left.snapshot.lines ?? [];
  const rightLines = right.snapshot.lines ?? [];
  const ids = [
    ...new Set([
      ...leftLines.map((row) => row.productId),
      ...rightLines.map((row) => row.productId),
    ]),
  ];
  return ids.map((id) => {
    const a = leftLines.find((row) => row.productId === id);
    const b = rightLines.find((row) => row.productId === id);
    const leftQty = a?.quantity ?? '—';
    const rightQty = b?.quantity ?? '—';
    const leftTotal = a ? formatPaise(a.lineTotalPaise) : '—';
    const rightTotal = b ? formatPaise(b.lineTotalPaise) : '—';
    return {
      productName: a?.productName ?? b?.productName ?? 'Pack',
      leftQty,
      rightQty,
      leftTotal,
      rightTotal,
      changed: leftQty !== rightQty || leftTotal !== rightTotal,
    };
  });
}

export function supplierOptionLabel(supplier: Supplier): string {
  return `${supplier.tradeName || supplier.legalName} (${supplier.supplierCode})`;
}

export function productOptionLabel(product: Product): string {
  return `${product.name} · ${product.sku}`;
}
