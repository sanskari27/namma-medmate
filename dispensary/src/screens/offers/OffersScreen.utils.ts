import type { OfferInput, OfferKind, OfferStatus, SalesOffer } from '@/services/offers';
import { AlertCircle, CheckCircle2, WifiOff } from 'lucide-react';

export type PageStatus =
  'loading' | 'empty' | 'validation' | 'denied' | 'conflict' | 'failure' | 'success' | null;

export type FormState = {
  name: string;
  kind: OfferKind;
  priority: string;
  buyQuantity: string;
  getQuantity: string;
  startsAt: string;
  endsAt: string;
  percentBps: string;
  productIds: string[];
};

export const emptyForm = (): FormState => ({
  name: '',
  kind: 'BOGO',
  priority: '10',
  buyQuantity: '2',
  getQuantity: '1',
  startsAt: '',
  endsAt: '',
  percentBps: '1000',
  productIds: [],
});

export function hasSalesAccess(modules: string[] | undefined): boolean {
  return Boolean(modules?.includes('SALES'));
}

export function statusCopy(status: PageStatus, hint?: string | null): string | null {
  if (hint) {
    return hint;
  }
  switch (status) {
    case 'loading':
      return 'Loading schemes at this counter…';
    case 'empty':
      return 'No schemes yet. Add a BOGO or seasonal scheme for this counter.';
    case 'validation':
      return 'Name and at least one medicine are needed before saving this scheme.';
    case 'denied':
      return 'This till cannot manage schemes. Ask the owner to grant Sales.';
    case 'conflict':
      return 'This scheme was updated on another till. Refresh, then publish again.';
    case 'failure':
      return 'Could not load schemes. Check the connection and try again.';
    case 'success':
      return 'Scheme saved.';
    default:
      return null;
  }
}

export function statusIcon(status: PageStatus) {
  if (status === 'success') {
    return CheckCircle2;
  }
  if (status === 'failure' || status === 'conflict') {
    return WifiOff;
  }
  return AlertCircle;
}

export function kindLabel(kind: OfferKind): string {
  switch (kind) {
    case 'BOGO':
      return 'Buy 2 get 1';
    case 'SEASONAL':
      return 'Seasonal';
    case 'BUNDLE':
      return 'Bundle';
    default:
      return kind;
  }
}

export function statusLabel(status: OfferStatus): string {
  switch (status) {
    case 'DRAFT':
      return 'Draft';
    case 'ACTIVE':
      return 'Live';
    case 'INACTIVE':
      return 'Off';
    default:
      return status;
  }
}

export function mapApiStatus(error: { status: number; code: string | null }): PageStatus {
  if (error.status === 403 || error.code === 'FORBIDDEN') {
    return 'denied';
  }
  if (error.status === 409 || error.code === 'STALE_STATE' || error.code === 'CONFLICT') {
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
  return null;
}

export function formValid(form: FormState): boolean {
  return Boolean(form.name.trim()) && form.productIds.length > 0;
}

const IST = 'Asia/Kolkata';

export function utcIsoToIstLocal(value: string | null): string {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
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
  if (!value) {
    return null;
  }
  const instant = new Date(`${value}:00+05:30`);
  if (Number.isNaN(instant.getTime())) {
    return null;
  }
  return instant.toISOString();
}

export function toForm(offer: SalesOffer): FormState {
  return {
    name: offer.name,
    kind: offer.kind,
    priority: String(offer.priority),
    buyQuantity: String(offer.buyQuantity ?? 2),
    getQuantity: String(offer.getQuantity ?? 1),
    startsAt: utcIsoToIstLocal(offer.startsAt),
    endsAt: utcIsoToIstLocal(offer.endsAt),
    percentBps: String(offer.kind === 'BOGO' ? 1000 : offer.benefitValue),
    productIds: [...new Set(offer.products.map((row) => row.productId))],
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
  return {
    name: form.name.trim(),
    kind: form.kind,
    priority: Number(form.priority),
    startsAt: istLocalToUtcIso(form.startsAt),
    endsAt: istLocalToUtcIso(form.endsAt),
    buyQuantity: form.kind === 'BOGO' ? Number(form.buyQuantity) : null,
    getQuantity: form.kind === 'BOGO' ? Number(form.getQuantity) : null,
    benefitType: form.kind === 'BOGO' ? 'FREE_QTY' : 'PERCENT',
    benefitValue: form.kind === 'BOGO' ? Number(form.getQuantity) : Number(form.percentBps),
    expectedVersion,
    products,
  };
}
