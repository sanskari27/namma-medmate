import { AlertCircle, CheckCircle2, WifiOff } from 'lucide-react';
import type { LicenseDocType, LicenseScope } from '@/services/licenses';

export type PageStatus =
  'loading' | 'empty' | 'validation' | 'denied' | 'conflict' | 'failure' | 'success' | null;

export type FormState = {
  docType: LicenseDocType;
  scope: LicenseScope;
  branchId: string;
  staffUserId: string;
  licenseNumber: string;
  issuedOn: string;
  expiresOn: string;
  evidence: File | null;
};

export const emptyForm = (): FormState => ({
  docType: 'DRUG_LICENSE',
  scope: 'TENANT',
  branchId: '',
  staffUserId: '',
  licenseNumber: '',
  issuedOn: '',
  expiresOn: '',
  evidence: null,
});

export function isOwner(role: string | undefined): boolean {
  return role === 'pharmacy_owner';
}

export function statusCopy(status: PageStatus, hint?: string | null): string | null {
  if (hint) {
    return hint;
  }
  switch (status) {
    case 'loading':
      return 'Loading licences for this pharmacy…';
    case 'empty':
      return 'No licences on file. File the drug licence, GST, FSSAI, or a pharmacist registration.';
    case 'validation':
      return 'Number, issue date, expiry, and an evidence file are needed before filing.';
    case 'denied':
      return 'Only the owner can file licences at this counter. Ask the owner if a paper is due.';
    case 'conflict':
      return 'This licence was updated on another till. Reload, then file again.';
    case 'failure':
      return 'Could not load licences. Check the connection and try again.';
    case 'success':
      return 'Licence filed.';
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
  if (code === 'LICENSE_DATE_INVALID') {
    return 'Issue date must be on or before expiry.';
  }
  if (code === 'MISSING_EVIDENCE') {
    return 'Attach a PDF, JPEG, or PNG of the current paper.';
  }
  if (code === 'INVALID_LICENSE') {
    return 'Pharmacist registration needs a number.';
  }
  if (code === 'CONFLICT') {
    return 'That paper is already on file for this outlet or chemist.';
  }
  return null;
}

export function formValid(form: FormState, creating: boolean): boolean {
  if (!form.licenseNumber.trim() || !form.issuedOn || !form.expiresOn) {
    return false;
  }
  if (creating && !form.evidence) {
    return false;
  }
  if (!creating && !form.evidence) {
    return false;
  }
  if (form.scope === 'BRANCH' && !form.branchId) {
    return false;
  }
  if (form.docType === 'PHARMACIST_REGISTRATION' && !form.staffUserId) {
    return false;
  }
  return true;
}

export function typeLabel(type: LicenseDocType): string {
  switch (type) {
    case 'DRUG_LICENSE':
      return 'Drug licence';
    case 'GST':
      return 'GST';
    case 'FSSAI':
      return 'FSSAI';
    case 'PHARMACIST_REGISTRATION':
      return 'Pharmacist registration';
    default:
      return type;
  }
}

export function scopeLabel(scope: LicenseScope): string {
  switch (scope) {
    case 'TENANT':
      return 'Pharmacy';
    case 'BRANCH':
      return 'Outlet';
    case 'STAFF':
      return 'Chemist';
    default:
      return scope;
  }
}

export function formatIstDate(value: string): string {
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
