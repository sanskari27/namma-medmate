import type {
  OfferBenefitType,
  OfferInput,
  OfferKind,
  OfferStatus,
  SalesOffer,
} from '@/services/offers';
import { AlertCircle, CheckCircle2, WifiOff } from 'lucide-react';
import { OFFERS_CONTENT } from './OffersScreen.content';

export type PageStatus =
  | 'loading'
  | 'idle'
  | 'empty'
  | 'validation'
  | 'denied'
  | 'conflict'
  | 'failure'
  | 'success'
  | null;

export type FormState = {
  name: string;
  kind: OfferKind;
  priority: string;
  buyQuantity: string;
  getQuantity: string;
  startsAt: string;
  endsAt: string;
  benefitMode: 'PERCENT' | 'FLAT';
  percentValue: string;
  flatRupees: string;
  couponCode: string;
  onlineVisible: boolean;
  productIds: string[];
};

export const emptyForm = (): FormState => ({
  name: '',
  kind: 'SEASONAL',
  priority: '10',
  buyQuantity: '2',
  getQuantity: '1',
  startsAt: '',
  endsAt: '',
  benefitMode: 'PERCENT',
  percentValue: '10',
  flatRupees: '50',
  couponCode: '',
  onlineVisible: true,
  productIds: [],
});

export function hasSalesAccess(modules: string[] | undefined): boolean {
  return Boolean(modules?.includes('SALES'));
}

export function statusCopy(status: PageStatus, hint?: string | null): string | null {
  if (hint) return hint;
  switch (status) {
    case 'loading':
      return OFFERS_CONTENT.status.loading;
    case 'empty':
      return OFFERS_CONTENT.status.empty;
    case 'validation':
      return OFFERS_CONTENT.status.validation;
    case 'denied':
      return OFFERS_CONTENT.status.denied;
    case 'conflict':
      return OFFERS_CONTENT.status.conflict;
    case 'failure':
      return OFFERS_CONTENT.status.failure;
    case 'success':
      return OFFERS_CONTENT.status.success;
    default:
      return null;
  }
}

export function statusIcon(status: PageStatus) {
  if (status === 'success') return CheckCircle2;
  if (status === 'failure' || status === 'conflict') return WifiOff;
  return AlertCircle;
}

export function mapApiStatus(error: { status: number; code: string | null }): PageStatus {
  if (error.status === 403 || error.code === 'FORBIDDEN') return 'denied';
  if (
    error.status === 409 ||
    error.code === 'STALE_STATE' ||
    error.code === 'CONFLICT' ||
    error.code === 'COUPON_TAKEN'
  ) {
    return 'conflict';
  }
  if (error.status === 400 || error.status === 422 || error.code === 'VALIDATION_ERROR') {
    return 'validation';
  }
  return 'failure';
}

export function apiStatusHint(code: string | null): string | null {
  if (code === 'INVALID_DATES') {
    return 'Start and end must be a valid window for this seasonal scheme.';
  }
  if (code === 'RECURSIVE_BUNDLE') {
    return 'A bundle cannot include another scheme. Pick medicines only.';
  }
  if (code === 'AMBIGUOUS_PRECEDENCE') {
    return 'Two live schemes share the same priority. Change one priority, then save again.';
  }
  if (code === 'COUPON_TAKEN') {
    return 'Another offer already uses this coupon code.';
  }
  return null;
}

export function formValid(form: FormState): boolean {
  return Boolean(form.name.trim()) && form.productIds.length > 0;
}

const IST = 'Asia/Kolkata';

export function utcIsoToIstLocal(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: IST,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function istLocalToUtcIso(value: string): string | null {
  if (!value) return null;
  const instant = new Date(`${value}:00+05:30`);
  if (Number.isNaN(instant.getTime())) return null;
  return instant.toISOString();
}

export function toForm(offer: SalesOffer): FormState {
  const percent =
    offer.benefitType === 'PERCENT' ? String((offer.benefitValue || 0) / 100) : '10';
  const flat =
    offer.benefitType === 'FLAT' ? String((offer.benefitValue || 0) / 100) : '50';
  return {
    name: offer.name,
    kind: offer.kind,
    priority: String(offer.priority),
    buyQuantity: String(offer.buyQuantity ?? 2),
    getQuantity: String(offer.getQuantity ?? 1),
    startsAt: utcIsoToIstLocal(offer.startsAt),
    endsAt: utcIsoToIstLocal(offer.endsAt),
    benefitMode: offer.benefitType === 'FLAT' ? 'FLAT' : 'PERCENT',
    percentValue: percent,
    flatRupees: flat,
    couponCode: offer.couponCode ?? '',
    onlineVisible: offer.onlineVisible,
    productIds: [...new Set(offer.products.map((row) => row.productId))],
  };
}

function benefitForForm(form: FormState): { benefitType: OfferBenefitType; benefitValue: number } {
  if (form.kind === 'BOGO') {
    return { benefitType: 'FREE_QTY', benefitValue: Number(form.getQuantity) || 0 };
  }
  if (form.benefitMode === 'FLAT') {
    return {
      benefitType: 'FLAT',
      benefitValue: Math.round((Number(form.flatRupees) || 0) * 100),
    };
  }
  return {
    benefitType: 'PERCENT',
    benefitValue: Math.round((Number(form.percentValue) || 0) * 100),
  };
}

export function toInput(form: FormState, expectedVersion?: number): OfferInput {
  const productIds = form.productIds;
  const products =
    form.kind === 'BOGO'
      ? productIds.flatMap((productId) => [
          { productId, slot: 'TRIGGER' as const },
          { productId, slot: 'BENEFIT' as const },
        ])
      : form.kind === 'BUNDLE'
        ? productIds.map((productId) => ({ productId, slot: 'BUNDLE' as const }))
        : productIds.map((productId) => ({ productId, slot: 'TRIGGER' as const }));
  const benefit = benefitForForm(form);
  let startsAt = form.kind === 'SEASONAL' ? istLocalToUtcIso(form.startsAt) : null;
  let endsAt = form.kind === 'SEASONAL' ? istLocalToUtcIso(form.endsAt) : null;
  if (form.kind === 'SEASONAL' && (!startsAt || !endsAt)) {
    const start = new Date();
    const end = new Date(start.getTime() + 90 * 24 * 60 * 60 * 1000);
    startsAt = startsAt ?? start.toISOString();
    endsAt = endsAt ?? end.toISOString();
  }
  return {
    name: form.name.trim(),
    kind: form.kind,
    priority: Number(form.priority) || 10,
    startsAt,
    endsAt,
    buyQuantity: form.kind === 'BOGO' ? Number(form.buyQuantity) : null,
    getQuantity: form.kind === 'BOGO' ? Number(form.getQuantity) : null,
    benefitType: benefit.benefitType,
    benefitValue: benefit.benefitValue,
    couponCode: form.couponCode.trim() || null,
    onlineVisible: form.onlineVisible,
    expectedVersion,
    products,
  };
}

export function benefitBadge(offer: SalesOffer): string {
  if (offer.kind === 'BOGO' || offer.benefitType === 'FREE_QTY') {
    return `Buy ${offer.buyQuantity ?? 1} Get ${offer.getQuantity ?? 1}`;
  }
  if (offer.benefitType === 'FLAT') {
    return `₹${Math.round((offer.benefitValue || 0) / 100)} OFF`;
  }
  return `${(offer.benefitValue || 0) / 100}% OFF`;
}

export function runStateLabel(status: OfferStatus): string {
  if (status === 'ACTIVE') return OFFERS_CONTENT.running;
  if (status === 'DRAFT') return OFFERS_CONTENT.draft;
  return OFFERS_CONTENT.paused;
}

export function isOfferRunning(status: OfferStatus): boolean {
  return status === 'ACTIVE';
}

export function appliesCopy(offer: SalesOffer): { scope: string; count: number } {
  const count = new Set(offer.products.map((p) => p.productId)).size;
  if (count === 0) return { scope: 'no products', count: 0 };
  if (count === 1) return { scope: '1 medicine', count };
  return { scope: 'selected medicines', count };
}
