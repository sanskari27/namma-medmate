import { apiClient, ApiError, isApiError, type ApiResponse } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export { ApiError, isApiError };

export type HospitalCreditTerms = 'ON_DEMAND' | 'NET_15' | 'NET_30' | 'NET_45';

export interface HospitalAccount {
  configured: boolean;
  id: string | null;
  institutionName: string | null;
  gstin: string | null;
  storesContact: string | null;
  billingPhone: string | null;
  billingEmail: string | null;
  creditTerms: HospitalCreditTerms | null;
  creditLimitPaise: number;
  balancePaise: number;
  availableCreditPaise: number;
  uniformDiscountBps: number;
  pendingPriceListApprovalRequestId: string | null;
  version: number;
}

export interface HospitalProductPrice {
  productId: string;
  productName: string;
  sku: string;
  mrpPaise: number;
  creditPricePaise: number;
  effectiveDiscountBps: number;
  ruleType: 'PERCENT' | 'FLAT_PAISE' | null;
  ruleValue: number | null;
}

export interface HospitalPriceList {
  uniformDiscountBps: number;
  pendingApprovalRequestId: string | null;
  items: HospitalProductPrice[];
}

export interface HospitalPriceUpdateResult {
  status: 'APPLIED' | 'PENDING_APPROVAL';
  priceList: HospitalPriceList;
  approvalRequestId: string | null;
}

export type HospitalAccountInput = {
  institutionName: string;
  gstin?: string | null;
  storesContact?: string | null;
  billingPhone?: string | null;
  billingEmail?: string | null;
  creditTerms: HospitalCreditTerms;
  creditLimitPaise: number;
  expectedVersion?: number | null;
};

export type HospitalPriceRuleInput = {
  productId: string;
  ruleType: 'PERCENT' | 'FLAT_PAISE';
  value: number;
};

export type HospitalPriceListInput = {
  uniformDiscountBps: number;
  productRules?: HospitalPriceRuleInput[];
  expectedVersion?: number | null;
};

export async function getHospitalAccount(): Promise<HospitalAccount> {
  const { data } = await apiClient.get<ApiResponse<HospitalAccount>>(API.HOSPITAL_ACCOUNT);
  return data.data;
}

export async function saveHospitalAccount(input: HospitalAccountInput): Promise<HospitalAccount> {
  const { data } = await apiClient.put<ApiResponse<HospitalAccount>>(API.HOSPITAL_ACCOUNT, input);
  return data.data;
}

export async function getHospitalPrices(): Promise<HospitalPriceList> {
  const { data } = await apiClient.get<ApiResponse<HospitalPriceList>>(API.HOSPITAL_PRICES);
  return data.data;
}

export async function saveHospitalPrices(
  input: HospitalPriceListInput,
): Promise<HospitalPriceUpdateResult> {
  const { data } = await apiClient.put<ApiResponse<HospitalPriceUpdateResult>>(
    API.HOSPITAL_PRICES,
    input,
  );
  return data.data;
}

export type HospitalWardCategory =
  | 'GENERAL'
  | 'ICU'
  | 'PEDIATRIC'
  | 'MATERNITY'
  | 'SURGICAL'
  | 'PRIVATE';

export type HospitalBedOccupancyStatus = 'FREE' | 'OCCUPIED';

export interface HospitalBed {
  id: string;
  sequenceNo: number;
  label: string;
  occupancyStatus: HospitalBedOccupancyStatus;
  version: number;
}

export interface HospitalWard {
  id: string;
  name: string;
  code: string;
  floor: string | null;
  category: HospitalWardCategory;
  capacity: number;
  nurseInCharge: string | null;
  version: number;
  beds: HospitalBed[];
}

export interface HospitalWardOccupancy {
  wardCount: number;
  totalBeds: number;
  occupiedBeds: number;
  freeBeds: number;
  occupancyPercent: number;
  admittedCount: number;
  wards: HospitalWard[];
}

export type HospitalWardInput = {
  name: string;
  code: string;
  floor?: string | null;
  category: HospitalWardCategory;
  capacity: number;
  nurseInCharge?: string | null;
  expectedVersion?: number | null;
};

export async function getHospitalWards(): Promise<HospitalWardOccupancy> {
  const { data } = await apiClient.get<ApiResponse<HospitalWardOccupancy>>(API.HOSPITAL_WARDS);
  return data.data;
}

export async function createHospitalWard(input: HospitalWardInput): Promise<HospitalWard> {
  const { data } = await apiClient.post<ApiResponse<HospitalWard>>(API.HOSPITAL_WARDS, input);
  return data.data;
}

export async function updateHospitalWard(
  wardId: string,
  input: HospitalWardInput,
): Promise<HospitalWard> {
  const { data } = await apiClient.put<ApiResponse<HospitalWard>>(
    API.hospitalWard(wardId),
    input,
  );
  return data.data;
}

export type HospitalDepartmentType = 'OPD' | 'IPD' | 'DIAGNOSTIC';

export interface HospitalDepartment {
  id: string;
  name: string;
  type: HospitalDepartmentType;
  headDoctorId: string | null;
  headDoctorName: string | null;
  version: number;
}

export type HospitalDepartmentInput = {
  name: string;
  type: HospitalDepartmentType;
  headDoctorId?: string | null;
  expectedVersion?: number | null;
};

export async function getHospitalDepartments(): Promise<HospitalDepartment[]> {
  const { data } = await apiClient.get<ApiResponse<{ items: HospitalDepartment[] }>>(
    API.HOSPITAL_DEPARTMENTS,
  );
  return data.data.items;
}

export async function createHospitalDepartment(
  input: HospitalDepartmentInput,
): Promise<HospitalDepartment> {
  const { data } = await apiClient.post<ApiResponse<HospitalDepartment>>(
    API.HOSPITAL_DEPARTMENTS,
    input,
  );
  return data.data;
}

export async function updateHospitalDepartment(
  departmentId: string,
  input: HospitalDepartmentInput,
): Promise<HospitalDepartment> {
  const { data } = await apiClient.put<ApiResponse<HospitalDepartment>>(
    API.hospitalDepartment(departmentId),
    input,
  );
  return data.data;
}

export type HospitalDoctorStatus = 'AVAILABLE' | 'ON_LEAVE' | 'VISITING';

export interface HospitalDoctor {
  id: string;
  doctorId: string;
  name: string;
  registrationNumber: string | null;
  phone: string | null;
  departmentId: string | null;
  departmentName: string | null;
  qualification: string | null;
  specialty: string | null;
  gender: string | null;
  experienceYears: number | null;
  email: string | null;
  opdRoom: string | null;
  consultingDays: string | null;
  consultingHours: string | null;
  consultationFeePaise: number;
  status: HospitalDoctorStatus;
  languages: string | null;
  notes: string | null;
  version: number;
}

export type HospitalDoctorInput = {
  name: string;
  registrationNumber?: string | null;
  phone?: string | null;
  departmentId?: string | null;
  qualification?: string | null;
  specialty?: string | null;
  gender?: string | null;
  experienceYears?: number | null;
  email?: string | null;
  opdRoom?: string | null;
  consultingDays?: string | null;
  consultingHours?: string | null;
  consultationFeePaise?: number | null;
  status: HospitalDoctorStatus;
  languages?: string | null;
  notes?: string | null;
  expectedVersion?: number | null;
};

export async function getHospitalDoctors(): Promise<HospitalDoctor[]> {
  const { data } = await apiClient.get<ApiResponse<{ items: HospitalDoctor[] }>>(
    API.HOSPITAL_DOCTORS,
  );
  return data.data.items;
}

export async function createHospitalDoctor(input: HospitalDoctorInput): Promise<HospitalDoctor> {
  const { data } = await apiClient.post<ApiResponse<HospitalDoctor>>(API.HOSPITAL_DOCTORS, input);
  return data.data;
}

export async function updateHospitalDoctor(
  doctorId: string,
  input: HospitalDoctorInput,
): Promise<HospitalDoctor> {
  const { data } = await apiClient.put<ApiResponse<HospitalDoctor>>(
    API.hospitalDoctor(doctorId),
    input,
  );
  return data.data;
}
