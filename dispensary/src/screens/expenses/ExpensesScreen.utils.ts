import { AlertCircle, CheckCircle2, WifiOff } from 'lucide-react';

export type PageStatus =
  | 'loading'
  | 'empty'
  | 'validation'
  | 'denied'
  | 'conflict'
  | 'failure'
  | 'success'
  | null;

export type OutletScope = 'session' | 'tenant';

export type SpendState = 'POSTED' | 'PENDING' | 'REJECTED';

export type FormState = {
  categoryId: string;
  amountRupees: string;
  occurredOn: string;
  notes: string;
  evidence: File | null;
  newCode: string;
  newLabel: string;
};

export const emptyForm = (): FormState => ({
  categoryId: '',
  amountRupees: '',
  occurredOn: '',
  notes: '',
  evidence: null,
  newCode: '',
  newLabel: '',
});

export function hasFinanceAccess(role: string | undefined, modules: string[] | undefined): boolean {
  if (role === 'pharmacy_owner') {
    return true;
  }
  return modules?.includes('FINANCE') === true;
}

export function statusCopy(
  status: PageStatus,
  hint?: string | null,
  spendState: SpendState = 'POSTED',
): string | null {
  if (hint) {
    return hint;
  }
  switch (status) {
    case 'loading':
      return 'Loading shop spend for this outlet…';
    case 'empty':
      if (spendState === 'PENDING') {
        return 'Spend posts as you record it — nothing waits on sign-off.';
      }
      if (spendState === 'REJECTED') {
        return 'Phase 1 does not reject spend.';
      }
      return 'No spend on the books. Record rent, power, salaries, or miscellaneous.';
    case 'validation':
      return 'Category, amount, and the date it occurred are needed before saving.';
    case 'denied':
      return 'Till staff cannot open shop books. Ask the owner for Accounts access.';
    case 'conflict':
      return 'This spend was updated on another till. Reload, then save again.';
    case 'failure':
      return 'Could not load shop spend. Check the connection and try again.';
    case 'success':
      return 'Spend recorded for this outlet.';
    default:
      return null;
  }
}

export function listEmptyCopy(spendState: SpendState): string {
  if (spendState === 'PENDING') {
    return 'Nothing waiting at this counter.';
  }
  if (spendState === 'REJECTED') {
    return 'Nothing turned down at this counter.';
  }
  return 'Record the first spend from this counter.';
}

export function postingLabel(status: string | undefined): string {
  if (status === 'PENDING') {
    return 'Waiting';
  }
  if (status === 'REJECTED') {
    return 'Turned down';
  }
  return 'On the books';
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

export function mapApiStatus(error: { status: number; code: string | null }): PageStatus {
  if (error.status === 403 || error.code === 'FORBIDDEN') {
    return 'denied';
  }
  if (error.status === 409 || error.code === 'STALE_STATE' || error.code === 'CONFLICT') {
    return 'conflict';
  }
  if (error.status === 400 || error.status === 422) {
    return 'validation';
  }
  return 'failure';
}

export function apiStatusHint(code: string | null): string | null {
  if (code === 'INVALID_AMOUNT') {
    return 'Amount must be more than zero.';
  }
  if (code === 'INVALID_DATE') {
    return 'Occurred date must be today or earlier.';
  }
  if (code === 'INVALID_CATEGORY') {
    return 'Pick a category from the shop books.';
  }
  if (code === 'CATEGORY_TAKEN') {
    return 'That category is already on the books.';
  }
  if (code === 'STALE_STATE') {
    return 'This spend was updated on another till. Reload, then save again.';
  }
  return null;
}

export function rupeesToPaise(value: string): number | null {
  const cleaned = value.trim().replace(/,/g, '');
  if (!cleaned) {
    return null;
  }
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    return null;
  }
  const [rupees, fraction = ''] = cleaned.split('.');
  const paise = Number.parseInt(rupees, 10) * 100 + Number.parseInt(fraction.padEnd(2, '0') || '0', 10);
  return Number.isFinite(paise) ? paise : null;
}

export function formatPaise(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

export function formValid(form: FormState): boolean {
  return Boolean(form.categoryId && rupeesToPaise(form.amountRupees) && form.occurredOn);
}

export function formatOccurredOn(value: string): string {
  if (!value) {
    return '—';
  }
  const date = value.length === 10 ? new Date(`${value}T00:00:00Z`) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeZone: 'Asia/Kolkata',
  }).format(date);
}
