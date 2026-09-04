import type { SafetyCheckStatus, SafetyWarning } from '@/services/medicationSafety';
import type { Product } from '@/services/products';

export type PageStatus =
  'loading' | 'empty' | 'validation' | 'denied' | 'conflict' | 'failure' | 'success' | null;

const CONTROLLED_SCHEDULES = new Set(['H', 'H1', 'X', 'NDPS']);

export function hasSalesAccess(modules: string[] | undefined): boolean {
  return Boolean(modules?.includes('SALES'));
}

export function canDispenseControlled(
  role: string | undefined,
  roles: { code: string | null }[] | undefined,
): boolean {
  if (role === 'pharmacy_owner') {
    return true;
  }
  return Boolean(roles?.some((item) => item.code === 'pharmacist'));
}

export function isControlledProduct(product: Product): boolean {
  if (product.controlledSubstance) {
    return true;
  }
  return (
    product.scheduleClassification != null &&
    CONTROLLED_SCHEDULES.has(product.scheduleClassification)
  );
}

export function statusCopy(status: PageStatus): string | null {
  switch (status) {
    case 'loading':
      return 'Loading catalogue for this till…';
    case 'empty':
      return 'No medicines in the catalogue yet. Add stock in Inventory, then build a draft here.';
    case 'validation':
      return 'Link a customer, add at least one medicine, and enter a review reason when warnings appear. Schedule packs also need a prescriber and Prescription checked.';
    case 'denied':
      return 'This till cannot run Sales safety checks, or a cashier-only login cannot dispense Schedule H, H1, X, or NDPS stock.';
    case 'conflict':
      return 'Draft warnings changed. Re-check before completing.';
    case 'failure':
      return 'Could not reach medication safety checks. Try again.';
    case 'success':
      return 'Safety review recorded. Sale posting arrives with full billing — draft is cleared for now.';
    default:
      return null;
  }
}

export function mapApiStatus(error: { status?: number; code?: string | null }): PageStatus {
  if (error.status === 403 || error.code === 'FORBIDDEN' || error.code === 'PHARMACIST_REQUIRED') {
    return 'denied';
  }
  if (error.status === 409 || error.code === 'CONFLICT') {
    return 'conflict';
  }
  if (
    error.status === 400 ||
    error.status === 422 ||
    error.code === 'VALIDATION_ERROR' ||
    error.code === 'UNLINKED_CUSTOMER' ||
    error.code === 'INCOMPLETE_CONTROLLED'
  ) {
    return 'validation';
  }
  return 'failure';
}

export function checkStatusLabel(
  checkStatus: SafetyCheckStatus | null,
  checkLabel: string | null,
): string | null {
  if (!checkStatus) {
    return null;
  }
  if (checkStatus === 'INCOMPLETE' || checkStatus === 'NOT_CHECKED') {
    return checkLabel ?? 'Not checked';
  }
  return null;
}

export function warningSummary(
  warning: SafetyWarning,
  productNames?: Record<string, string>,
): string {
  if (warning.kind === 'ALLERGY') {
    const productName = (warning.productId && productNames?.[warning.productId]) || 'this medicine';
    return `Allergy match: ${warning.matchedAllergen ?? 'allergen'} on ${productName} — review before completing.`;
  }
  const names =
    warning.productIds
      ?.map((id) => productNames?.[id])
      .filter(Boolean)
      .join(', ') || 'draft lines';
  return `Same composition on ${names} (${warning.matchedComposition ?? 'composition'}) — review before completing.`;
}
