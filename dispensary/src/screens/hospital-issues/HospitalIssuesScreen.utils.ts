import type { HospitalIssue, HospitalIssueKind, HospitalIssueReason } from '@/services/hospital';
import type { StockBatchDetail } from '@/services/inventory';

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

export type IssueKindFilter = HospitalIssueKind;

export type BatchOption = {
  batchId: string;
  label: string;
  suggestedFefo: boolean;
};

export type IssueLineDraft = {
  productId: string;
  productName: string;
  batchId: string;
  batchLabel: string;
  quantity: string;
};

export type IssueDraft = {
  wardId: string;
  indentId: string;
  reason: HospitalIssueReason;
  uhid: string;
  patientName: string;
  lines: IssueLineDraft[];
};

export const KIND_FILTERS: IssueKindFilter[] = ['ALL', 'ISSUES', 'REFILLS', 'RETURNS'];

export function emptyDraft(): IssueDraft {
  return {
    wardId: '',
    indentId: '',
    reason: 'FLOOR_STOCK',
    uhid: '',
    patientName: '',
    lines: [{ productId: '', productName: '', batchId: '', batchLabel: '', quantity: '' }],
  };
}

export function reasonLabel(reason: HospitalIssueReason): string {
  switch (reason) {
    case 'FLOOR_STOCK':
      return 'Floor stock';
    case 'CONSUMPTION':
      return 'Consumption';
    case 'PATIENT_REFILL':
      return 'Patient refill';
    default:
      return reason;
  }
}

export function formatPaise(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
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

export function validationMessage(draft: IssueDraft): string | null {
  if (!draft.wardId.trim() || draft.lines.every((line) => !line.productId || !line.batchId || Number(line.quantity) <= 0)) {
    return 'validation';
  }
  if (draft.reason === 'PATIENT_REFILL' && !draft.uhid.trim()) {
    return 'refill';
  }
  return null;
}

export function issueSearchHaystack(issue: HospitalIssue): string {
  const lineNames = issue.lines.map((line) => line.productName).join(' ');
  return `${issue.invoiceNumber} ${issue.wardName} ${issue.patientName ?? ''} ${issue.uhid ?? ''} ${lineNames}`.toLowerCase();
}

export function matchesIssueFilter(
  issue: HospitalIssue,
  wardId: string,
  kind: IssueKindFilter,
  query: string,
): boolean {
  if (wardId && issue.wardId !== wardId) {
    return false;
  }
  if (kind === 'RETURNS') {
    return false;
  }
  if (kind === 'REFILLS' && issue.reason !== 'PATIENT_REFILL') {
    return false;
  }
  if (kind === 'ISSUES' && issue.reason === 'PATIENT_REFILL') {
    return false;
  }
  const needle = query.trim().toLowerCase();
  return !needle || issueSearchHaystack(issue).includes(needle);
}

export function toBatchOptions(batches: StockBatchDetail[]): BatchOption[] {
  return batches.flatMap((batch) => {
    if (!batch.batchId) {
      return [];
    }
    return [
      {
        batchId: batch.batchId,
        label: `${batch.batchNumber ?? 'Batch'}${batch.suggestedFefo ? ' · FEFO suggested' : ''}`,
        suggestedFefo: batch.suggestedFefo === true,
      },
    ];
  });
}

export function pickFefo(options: BatchOption[]): BatchOption | undefined {
  return options.find((option) => option.suggestedFefo) ?? options[0];
}
