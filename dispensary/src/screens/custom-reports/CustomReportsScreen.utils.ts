import { AlertCircle, CheckCircle2, WifiOff } from 'lucide-react';
import { hasReportingAccess } from '@/libs/reportingAccess';
import type { CustomReportFilter } from '@/services/customReports';

export type PageStatus =
  'loading' | 'empty' | 'validation' | 'denied' | 'conflict' | 'failure' | 'success' | null;

export type OutletScope = 'session' | 'tenant';

export type FilterDraft = {
  field: string;
  operator: string;
  value: string;
};

export { hasReportingAccess };

export function todayIst(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

export function emptyDraft(): FilterDraft {
  return { field: '', operator: 'EQ', value: '' };
}

export function filtersValid(from: string, to: string): boolean {
  if (!from || !to) {
    return false;
  }
  return from <= to;
}

export function isFutureRange(to: string, today = todayIst()): boolean {
  return Boolean(to) && to > today;
}

export function toApiFilters(draft: FilterDraft): CustomReportFilter[] {
  if (!draft.field || !draft.value.trim()) {
    return [];
  }
  return [{ field: draft.field, operator: draft.operator, value: draft.value.trim() }];
}

export function filenameFor(dataset: string, format: 'csv' | 'pdf'): string {
  return `${dataset.toLowerCase()}-report.${format}`;
}

export function statusCopy(status: PageStatus, hint?: string | null): string | null {
  if (hint) {
    return hint;
  }
  switch (status) {
    case 'loading':
      return 'Loading the report builder…';
    case 'empty':
      return null;
    case 'validation':
      return 'Choose a period that starts on or before the end date.';
    case 'denied':
      return 'Till staff cannot build a report. Ask the owner for Accounts access.';
    case 'conflict':
      return 'This report changed on another till. Reload, then show rows again.';
    case 'failure':
      return 'Could not build this report. Check the connection and try again.';
    case 'success':
      return 'Rows from this outlet for the dates you picked.';
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
    return 'Build a report is on Growth. Open the plan to turn it on.';
  }
  if (code === 'UNKNOWN_FIELD') {
    return 'That column is not on this report. Pick from the list.';
  }
  if (code === 'UNKNOWN_OPERATOR') {
    return 'That filter is not allowed on this column.';
  }
  if (code === 'RANGE_UNSUPPORTED') {
    return 'Use a date range of 366 days or less, with from before to.';
  }
  if (code === 'EXPORT_TOO_LARGE') {
    return 'Narrow the date range. This report is too large to export in one file.';
  }
  if (code === 'NO_ACTIVE_BRANCH') {
    return 'Select an outlet before building a report.';
  }
  if (code === 'STALE_STATE') {
    return 'This report changed on another till. Reload, then show rows again.';
  }
  return null;
}
