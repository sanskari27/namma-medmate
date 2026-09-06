import { AlertCircle, CheckCircle2, WifiOff } from 'lucide-react';
import { hasReportingAccess } from '@/libs/reportingAccess';

export type PageStatus =
  'loading' | 'empty' | 'validation' | 'denied' | 'conflict' | 'failure' | 'success' | null;

export type CompareKind = 'WOW' | 'MOM';
export type OutletScope = 'session' | 'tenant';

export { hasReportingAccess };

export function isEmptyWindow(currentPaise: number, priorPaise: number): boolean {
  return currentPaise === 0 && priorPaise === 0;
}

export function formatPaise(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

export function frequencyLabel(bucket: string): string {
  switch (bucket) {
    case 'WALK_IN':
      return 'Walk-in bills';
    case 'VISITS_1':
      return 'One visit';
    case 'VISITS_2_3':
      return 'Two or three visits';
    case 'VISITS_4_PLUS':
      return 'Four or more visits';
    default:
      return bucket;
  }
}

export function stockClassLabel(classification: string): string {
  return classification === 'DEAD' ? 'Idle' : 'Slow';
}

export function statusCopy(status: PageStatus, hint?: string | null): string | null {
  if (hint) {
    return hint;
  }
  switch (status) {
    case 'loading':
      return 'Loading this week vs last week…';
    case 'empty':
      return 'No completed bills in this window. Collect a bill at the till and it lands here.';
    case 'validation':
      return 'Use matching week or month windows of 366 days or less.';
    case 'denied':
      return 'Till staff cannot open compare weeks. Ask the owner for Accounts access.';
    case 'conflict':
      return 'This window changed on another till. Reload, then compare again.';
    case 'failure':
      return 'Could not load compare weeks. Check the connection and try again.';
    case 'success':
      return 'This week vs last week from completed bills.';
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
  if (error.code === 'PLAN_LIMIT' || error.status === 403 || error.code === 'FORBIDDEN') {
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
  if (code === 'PLAN_LIMIT') {
    return 'Compare weeks is on Growth. Open the plan to turn it on.';
  }
  if (code === 'RANGE_UNSUPPORTED') {
    return 'Use matching week or month windows of 366 days or less.';
  }
  if (code === 'NO_ACTIVE_BRANCH') {
    return 'Select an outlet before comparing weeks.';
  }
  if (code === 'STALE_STATE') {
    return 'This window changed on another till. Reload, then compare again.';
  }
  return null;
}
