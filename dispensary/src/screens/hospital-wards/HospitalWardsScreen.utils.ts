import type { HospitalWardCategory } from '@/services/hospital';

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
  | 'duplicate_code'
  | null;

export type WardDraft = {
  id: string | null;
  name: string;
  code: string;
  floor: string;
  category: HospitalWardCategory;
  capacity: string;
  nurseInCharge: string;
  version: number;
};

export const WARD_CATEGORIES: HospitalWardCategory[] = [
  'GENERAL',
  'ICU',
  'PEDIATRIC',
  'MATERNITY',
  'SURGICAL',
  'PRIVATE',
];

export function categoryLabel(category: HospitalWardCategory): string {
  switch (category) {
    case 'GENERAL':
      return 'General';
    case 'ICU':
      return 'ICU';
    case 'PEDIATRIC':
      return 'Pediatric';
    case 'MATERNITY':
      return 'Maternity';
    case 'SURGICAL':
      return 'Surgical';
    case 'PRIVATE':
      return 'Private';
    default:
      return category;
  }
}

export function emptyDraft(): WardDraft {
  return {
    id: null,
    name: '',
    code: '',
    floor: '',
    category: 'GENERAL',
    capacity: '1',
    nurseInCharge: '',
    version: 0,
  };
}

export function parseCapacity(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value <= 0 || !Number.isInteger(value)) {
    return null;
  }
  return value;
}

export function mapHttpStatus(status: number, code: string | null): PageStatus {
  if (status === 403) {
    return 'denied';
  }
  if (status === 409 && code === 'DUPLICATE_CODE') {
    return 'duplicate_code';
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
