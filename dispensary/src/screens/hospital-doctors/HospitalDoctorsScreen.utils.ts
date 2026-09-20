import type { HospitalDoctor, HospitalDoctorStatus } from '@/services/hospital';

export type PageStatus =
  | 'loading'
  | 'empty'
  | 'validation'
  | 'denied'
  | 'conflict'
  | 'failure'
  | 'success'
  | 'plan_limit'
  | 'registration_taken'
  | null;

export type DoctorDraft = {
  doctorId: string | null;
  name: string;
  registrationNumber: string;
  phone: string;
  departmentId: string;
  qualification: string;
  specialty: string;
  gender: string;
  experienceYears: string;
  email: string;
  opdRoom: string;
  consultingDays: string;
  consultingHours: string;
  consultationFeeRupees: string;
  status: HospitalDoctorStatus;
  languages: string;
  notes: string;
  version: number;
};

export const DOCTOR_STATUSES: HospitalDoctorStatus[] = ['AVAILABLE', 'ON_LEAVE', 'VISITING'];

export function statusLabel(status: HospitalDoctorStatus): string {
  switch (status) {
    case 'AVAILABLE':
      return 'Available';
    case 'ON_LEAVE':
      return 'On leave';
    case 'VISITING':
      return 'Visiting';
    default:
      return status;
  }
}

export function emptyDraft(): DoctorDraft {
  return {
    doctorId: null,
    name: '',
    registrationNumber: '',
    phone: '',
    departmentId: '',
    qualification: '',
    specialty: '',
    gender: '',
    experienceYears: '',
    email: '',
    opdRoom: '',
    consultingDays: '',
    consultingHours: '',
    consultationFeeRupees: '',
    status: 'AVAILABLE',
    languages: '',
    notes: '',
    version: 0,
  };
}

export function doctorToDraft(doctor: HospitalDoctor): DoctorDraft {
  return {
    doctorId: doctor.doctorId,
    name: doctor.name,
    registrationNumber: doctor.registrationNumber ?? '',
    phone: doctor.phone ?? '',
    departmentId: doctor.departmentId ?? '',
    qualification: doctor.qualification ?? '',
    specialty: doctor.specialty ?? '',
    gender: doctor.gender ?? '',
    experienceYears: doctor.experienceYears == null ? '' : String(doctor.experienceYears),
    email: doctor.email ?? '',
    opdRoom: doctor.opdRoom ?? '',
    consultingDays: doctor.consultingDays ?? '',
    consultingHours: doctor.consultingHours ?? '',
    consultationFeeRupees:
      doctor.consultationFeePaise === 0 ? '' : String(doctor.consultationFeePaise / 100),
    status: doctor.status,
    languages: doctor.languages ?? '',
    notes: doctor.notes ?? '',
    version: doctor.version,
  };
}

export function parseFeePaise(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return 0;
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) {
    return null;
  }
  return Math.round(value * 100);
}

export function parseExperience(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
    return null;
  }
  return value;
}

export function mapHttpStatus(status: number, code: string | null): PageStatus {
  if (status === 403) {
    return 'denied';
  }
  if (status === 409 && code === 'REGISTRATION_TAKEN') {
    return 'registration_taken';
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
