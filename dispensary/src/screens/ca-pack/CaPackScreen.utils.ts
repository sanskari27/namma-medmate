import { AlertCircle, CheckCircle2, WifiOff } from 'lucide-react';
import { SHARE_TOGGLES, type ShareToggleId } from './CaPackScreen.content';

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

export type AdvisorKind = 'CA' | 'Accountant';

export type Advisor = {
  id: string;
  kind: AdvisorKind;
  name: string;
  firm: string;
  email: string;
  phone: string;
};

export type ShareHistoryItem = {
  id: string;
  at: string;
  period: string;
  advisorName: string;
  reports: string[];
};

export type PeriodOption = {
  key: string;
  label: string;
  from: string;
  to: string;
};

const ADVISORS_KEY = 'namma-ca-advisors';
const HISTORY_KEY = 'namma-ca-share-history';

export { hasFinanceAccess } from '@/libs/financeAccess';

export function todayIst(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

export function monthStart(month: string): string {
  return `${month}-01`;
}

export function monthEnd(month: string, today = todayIst()): string {
  const [year, mo] = month.split('-').map(Number);
  const end = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(
    new Date(year, mo, 0),
  );
  return end > today ? today : end;
}

export function periodOptions(today = todayIst()): PeriodOption[] {
  const [year, month] = today.split('-').map(Number);
  const options: PeriodOption[] = [];
  for (let i = 0; i < 3; i += 1) {
    const date = new Date(year, month - 1 - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    options.push({
      key,
      label: new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(date),
      from: `${key}-01`,
      to: monthEnd(key, today),
    });
  }
  const fyStartYear = month >= 4 ? year : year - 1;
  options.push({
    key: `fy-${fyStartYear}`,
    label: `FY ${fyStartYear}-${String(fyStartYear + 1).slice(2)}`,
    from: `${fyStartYear}-04-01`,
    to: monthEnd(`${fyStartYear + 1}-03`, today),
  });
  return options;
}

export function defaultEnabled(): Record<ShareToggleId, boolean> {
  return {
    gst: true,
    sales: true,
    purchase: false,
    pnl: true,
    daybook: false,
  };
}

export function selectedKeys(enabled: Record<ShareToggleId, boolean>): string[] {
  return SHARE_TOGGLES.flatMap((row) => (enabled[row.id] ? [...row.keys] : []));
}

export function selectedCount(enabled: Record<ShareToggleId, boolean>): number {
  return SHARE_TOGGLES.filter((row) => enabled[row.id]).length;
}

export function lastName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1] || 'CA';
}

export function formatPaise(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

export function emptyAdvisor(kind: AdvisorKind): Advisor {
  return {
    id: '',
    kind,
    name: '',
    firm: '',
    email: '',
    phone: '',
  };
}

export function loadAdvisors(): Advisor[] {
  try {
    const raw = localStorage.getItem(ADVISORS_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as Advisor[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAdvisors(items: Advisor[]): void {
  localStorage.setItem(ADVISORS_KEY, JSON.stringify(items));
}

export function loadHistory(): ShareHistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as ShareHistoryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveHistory(items: ShareHistoryItem[]): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 20)));
}

export function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(date);
}

export function statusCopy(status: PageStatus, hint?: string | null): string | null {
  if (hint) {
    return hint;
  }
  switch (status) {
    case 'loading':
      return 'Loading the CA pack…';
    case 'empty':
      return 'Nothing to pack yet. Complete a sale or post spend, then take this file.';
    case 'validation':
      return 'Choose at least one report to share.';
    case 'denied':
      return 'Till staff cannot open the CA pack. Ask the owner for the Accountant desk.';
    case 'conflict':
      return 'This pack changed on another till. Reload, then download again.';
    case 'failure':
      return 'Could not load the CA pack. Check the connection and try again.';
    case 'success':
      return 'CA pack saved. Hand this file to the CA.';
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
  if (code === 'FUTURE_AS_OF') {
    return 'Report dates must be today or earlier.';
  }
  if (code === 'RANGE_UNSUPPORTED') {
    return 'Use a date range of 366 days or less, with from before to.';
  }
  if (code === 'NO_ACTIVE_BRANCH') {
    return 'Select an outlet before opening the CA pack.';
  }
  if (code === 'EXPORT_TOO_LARGE') {
    return 'Narrow the date range. This pack is too large to export in one file.';
  }
  if (code === 'STALE_STATE') {
    return 'This pack changed on another till. Reload, then download again.';
  }
  return null;
}
