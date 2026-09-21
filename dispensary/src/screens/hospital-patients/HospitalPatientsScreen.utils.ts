import type { AuthUser } from '@/store/auth.slice';
import type {
  HospitalActivePatient,
  HospitalActivePatientView,
  HospitalPatientSettleMode,
} from '@/services/hospital';
import { HOSPITAL_PATIENTS_CONTENT } from './HospitalPatientsScreen.content';

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

export type SettleDraft = {
  paymentMode: HospitalPatientSettleMode | '';
  insurerName: string;
  policyNumber: string;
};

export const SETTLE_MODES: HospitalPatientSettleMode[] = ['CASH', 'UPI', 'CARD', 'INSURANCE_TPA'];

export function emptySettleDraft(): SettleDraft {
  return { paymentMode: '', insurerName: '', policyNumber: '' };
}

export function patientRowKey(row: Pick<HospitalActivePatient, 'kind' | 'admissionId' | 'uhid'>): string {
  return row.kind === 'CASUALTY' || !row.admissionId ? `casualty:${row.uhid}` : row.admissionId;
}

export function canDischargeStay(user: AuthUser | null | undefined): boolean {
  if (!user) {
    return false;
  }
  if (user.role === 'pharmacy_owner') {
    return true;
  }
  return user.roles?.some((role) => role.code === 'pharmacist') === true;
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

export function saleSourceLabel(source: string): string {
  switch (source) {
    case 'WARD':
      return 'Ward';
    case 'EMERGENCY':
      return HOSPITAL_PATIENTS_CONTENT.casualty;
    default:
      return source;
  }
}

export function settleModeLabel(mode: HospitalPatientSettleMode): string {
  switch (mode) {
    case 'CASH':
      return HOSPITAL_PATIENTS_CONTENT.cash;
    case 'UPI':
      return HOSPITAL_PATIENTS_CONTENT.upi;
    case 'CARD':
      return HOSPITAL_PATIENTS_CONTENT.card;
    case 'INSURANCE_TPA':
      return HOSPITAL_PATIENTS_CONTENT.insuranceTpa;
    default:
      return mode;
  }
}

export function locationCopy(row: Pick<HospitalActivePatient, 'kind' | 'wardName' | 'locationLabel'>): string {
  if (row.kind === 'CASUALTY' || !row.wardName) {
    return row.locationLabel || HOSPITAL_PATIENTS_CONTENT.casualty;
  }
  return row.wardName;
}

export function settleValidation(draft: SettleDraft): string | null {
  if (!draft.paymentMode) {
    return HOSPITAL_PATIENTS_CONTENT.validation;
  }
  if (draft.paymentMode === 'INSURANCE_TPA' && (!draft.insurerName.trim() || !draft.policyNumber.trim())) {
    return HOSPITAL_PATIENTS_CONTENT.validation;
  }
  return null;
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

export function statusMessage(status: PageStatus, view: HospitalActivePatientView, message: string | null): string {
  if (message) {
    return message;
  }
  switch (status) {
    case 'loading':
      return HOSPITAL_PATIENTS_CONTENT.loading;
    case 'empty':
      return view === 'all' ? HOSPITAL_PATIENTS_CONTENT.emptyAll : HOSPITAL_PATIENTS_CONTENT.empty;
    case 'validation':
      return HOSPITAL_PATIENTS_CONTENT.validation;
    case 'denied':
      return HOSPITAL_PATIENTS_CONTENT.denied;
    case 'conflict':
      return HOSPITAL_PATIENTS_CONTENT.conflict;
    case 'failure':
      return HOSPITAL_PATIENTS_CONTENT.loadFailed;
    case 'plan_limit':
      return HOSPITAL_PATIENTS_CONTENT.planLimit;
    case 'no_branch':
      return HOSPITAL_PATIENTS_CONTENT.noBranch;
    case 'success':
      return HOSPITAL_PATIENTS_CONTENT.settled;
    default:
      return '';
  }
}
