import type { HospitalIndent, HospitalIndentStatus } from '@/services/hospital';

export type PageStatus =
  | 'loading'
  | 'empty'
  | 'validation'
  | 'denied'
  | 'conflict'
  | 'failure'
  | 'success'
  | 'plan_limit'
  | null;

export type StatusFilter = 'ALL' | HospitalIndentStatus;

export type IndentLineDraft = {
  productId: string;
  productName: string;
  quantity: string;
};

export type IndentDraft = {
  wardId: string;
  bedId: string;
  patientName: string;
  note: string;
  requestedBy: string;
  lines: IndentLineDraft[];
};

export const STATUS_FILTERS: StatusFilter[] = [
  'ALL',
  'PENDING',
  'APPROVED',
  'REJECTED',
  'ISSUED',
];

export function emptyDraft(): IndentDraft {
  return {
    wardId: '',
    bedId: '',
    patientName: '',
    note: '',
    requestedBy: '',
    lines: [{ productId: '', productName: '', quantity: '' }],
  };
}

export function statusLabel(status: HospitalIndentStatus): string {
  switch (status) {
    case 'PENDING':
      return 'Pending';
    case 'APPROVED':
      return 'Approved';
    case 'REJECTED':
      return 'Turned down';
    case 'ISSUED':
      return 'Issued';
    default:
      return status;
  }
}

export function patientOrNote(indent: HospitalIndent): string {
  if (indent.patientName) {
    return indent.patientName;
  }
  return indent.note ?? '—';
}

export function wardBedLabel(indent: HospitalIndent): string {
  if (indent.bedLabel) {
    return `${indent.wardName} · ${indent.bedLabel}`;
  }
  return indent.wardName;
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
  if (status === 400 || status === 422) {
    return 'validation';
  }
  return 'failure';
}

export function validateDraft(draft: IndentDraft): string | null {
  if (!draft.wardId.trim() || !draft.requestedBy.trim()) {
    return 'validation';
  }
  if (!draft.patientName.trim() && !draft.note.trim()) {
    return 'validation';
  }
  const validLines = draft.lines.filter(
    (line) => line.productId.trim() && Number(line.quantity) > 0,
  );
  if (validLines.length === 0) {
    return 'validation';
  }
  return null;
}
