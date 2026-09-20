import type { HospitalDepartmentType } from '@/services/hospital';

export type PageStatus =
  | 'loading'
  | 'empty'
  | 'validation'
  | 'denied'
  | 'conflict'
  | 'failure'
  | 'success'
  | 'plan_limit'
  | 'duplicate_name'
  | null;

export type DepartmentDraft = {
  id: string | null;
  name: string;
  type: HospitalDepartmentType;
  headDoctorId: string;
  version: number;
};

export const DEPARTMENT_TYPES: HospitalDepartmentType[] = ['OPD', 'IPD', 'DIAGNOSTIC'];

export function typeLabel(type: HospitalDepartmentType): string {
  switch (type) {
    case 'OPD':
      return 'OPD';
    case 'IPD':
      return 'IPD';
    case 'DIAGNOSTIC':
      return 'Diagnostic';
    default:
      return type;
  }
}

export function emptyDraft(): DepartmentDraft {
  return {
    id: null,
    name: '',
    type: 'OPD',
    headDoctorId: '',
    version: 0,
  };
}

export function mapHttpStatus(status: number, code: string | null): PageStatus {
  if (status === 403) {
    return 'denied';
  }
  if (status === 409 && code === 'DUPLICATE_NAME') {
    return 'duplicate_name';
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
