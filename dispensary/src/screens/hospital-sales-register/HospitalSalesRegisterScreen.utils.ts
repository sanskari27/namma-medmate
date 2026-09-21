import type {
  HospitalSalesRegisterQuery,
  HospitalSalesRegisterRow,
  HospitalSalesRegisterSource,
} from '@/services/hospital';
import { HOSPITAL_SALES_REGISTER_CONTENT } from './HospitalSalesRegisterScreen.content';

export type PageStatus =
  | 'loading'
  | 'empty'
  | 'validation'
  | 'denied'
  | 'conflict'
  | 'failure'
  | 'success'
  | 'plan_limit'
  | 'no_branch'
  | null;

export type RegisterFilters = {
  from: string;
  to: string;
  source: HospitalSalesRegisterSource | '';
  paymentMode: string;
  paid: '' | 'PAID' | 'UNPAID';
  insurer: string;
  wardId: string;
  q: string;
};

export function todayIst(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
}

export function emptyFilters(today = todayIst()): RegisterFilters {
  return {
    from: today,
    to: today,
    source: '',
    paymentMode: '',
    paid: '',
    insurer: '',
    wardId: '',
    q: '',
  };
}

export function rangeValid(from: string, to: string): boolean {
  if (!from || !to) {
    return false;
  }
  return from <= to;
}

export function toQuery(filters: RegisterFilters): HospitalSalesRegisterQuery {
  return {
    from: filters.from,
    to: filters.to,
    source: filters.source || undefined,
    paymentMode: filters.paymentMode || undefined,
    paid: filters.paid || undefined,
    insurer: filters.insurer.trim() || undefined,
    wardId: filters.wardId || undefined,
    q: filters.q.trim() || undefined,
  };
}

export function sourceLabel(source: string): string {
  switch (source) {
    case 'OPD_RX':
      return HOSPITAL_SALES_REGISTER_CONTENT.opd;
    case 'COUNTER':
      return HOSPITAL_SALES_REGISTER_CONTENT.counter;
    case 'WARD':
      return HOSPITAL_SALES_REGISTER_CONTENT.ward;
    case 'EMERGENCY':
      return HOSPITAL_SALES_REGISTER_CONTENT.casualty;
    default:
      return source;
  }
}

export function paymentLabel(mode: string): string {
  switch (mode) {
    case 'CASH':
      return HOSPITAL_SALES_REGISTER_CONTENT.cash;
    case 'CARD':
      return HOSPITAL_SALES_REGISTER_CONTENT.card;
    case 'UPI':
      return HOSPITAL_SALES_REGISTER_CONTENT.upi;
    case 'CREDIT':
      return HOSPITAL_SALES_REGISTER_CONTENT.credit;
    case 'INSURANCE_TPA':
      return HOSPITAL_SALES_REGISTER_CONTENT.insuranceTpa;
    default:
      return mode;
  }
}

export function formatPaise(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

export function formatIstDate(iso: string | null | undefined): string {
  if (!iso) {
    return '—';
  }
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

export function mapHttpStatus(status: number, code: string | null): PageStatus {
  if (status === 403) {
    return 'denied';
  }
  if (status === 409) {
    return 'conflict';
  }
  if (status === 422 && code === 'PLAN_LIMIT') {
    return 'plan_limit';
  }
  if (status === 422 && code === 'NO_ACTIVE_BRANCH') {
    return 'no_branch';
  }
  if (status === 400 || status === 422) {
    return 'validation';
  }
  return 'failure';
}

export function statusMessage(status: PageStatus, message: string | null): string | null {
  if (message) {
    return message;
  }
  switch (status) {
    case 'loading':
      return HOSPITAL_SALES_REGISTER_CONTENT.loading;
    case 'empty':
      return HOSPITAL_SALES_REGISTER_CONTENT.empty;
    case 'validation':
      return HOSPITAL_SALES_REGISTER_CONTENT.validation;
    case 'denied':
      return HOSPITAL_SALES_REGISTER_CONTENT.denied;
    case 'conflict':
      return HOSPITAL_SALES_REGISTER_CONTENT.conflict;
    case 'failure':
      return HOSPITAL_SALES_REGISTER_CONTENT.failure;
    case 'plan_limit':
      return HOSPITAL_SALES_REGISTER_CONTENT.planLimit;
    case 'no_branch':
      return HOSPITAL_SALES_REGISTER_CONTENT.noBranch;
    case 'success':
      return HOSPITAL_SALES_REGISTER_CONTENT.exported;
    default:
      return null;
  }
}

export function wardOptions(items: HospitalSalesRegisterRow[]): Array<{ id: string; name: string }> {
  const seen = new Map<string, string>();
  for (const item of items) {
    if (item.wardId && item.wardName) {
      seen.set(item.wardId, item.wardName);
    }
  }
  return [...seen.entries()].map(([id, name]) => ({ id, name }));
}

export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function hasRegisterAccess(
  _role: string | undefined,
  modules: string[] | undefined,
): boolean {
  return modules?.includes('HOSPITAL') === true || modules?.includes('REPORTING') === true;
}

export function isCashierWithoutRegister(
  role: string | undefined,
  modules: string[] | undefined,
  desks: Array<{ code: string | null }> | undefined,
): boolean {
  if (hasRegisterAccess(role, modules)) {
    return false;
  }
  if (role?.toLowerCase().includes('cashier')) {
    return true;
  }
  return desks?.some((desk) => desk.code === 'cashier') === true;
}
