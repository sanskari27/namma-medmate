import { apiClient, ApiError, isApiError } from '@/services/axios';
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
  const { data } = await apiClient.get<HospitalAccount>(API.HOSPITAL_ACCOUNT);
  return data;
}

export async function saveHospitalAccount(input: HospitalAccountInput): Promise<HospitalAccount> {
  const { data } = await apiClient.put<HospitalAccount>(API.HOSPITAL_ACCOUNT, input);
  return data;
}

export async function getHospitalPrices(): Promise<HospitalPriceList> {
  const { data } = await apiClient.get<HospitalPriceList>(API.HOSPITAL_PRICES);
  return data;
}

export async function saveHospitalPrices(
  input: HospitalPriceListInput,
): Promise<HospitalPriceUpdateResult> {
  const { data } = await apiClient.put<HospitalPriceUpdateResult>(
    API.HOSPITAL_PRICES,
    input,
  );
  return data;
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
  const { data } = await apiClient.get<HospitalWardOccupancy>(API.HOSPITAL_WARDS);
  return data;
}

export async function createHospitalWard(input: HospitalWardInput): Promise<HospitalWard> {
  const { data } = await apiClient.post<HospitalWard>(API.HOSPITAL_WARDS, input);
  return data;
}

export async function updateHospitalWard(
  wardId: string,
  input: HospitalWardInput,
): Promise<HospitalWard> {
  const { data } = await apiClient.put<HospitalWard>(
    API.hospitalWard(wardId),
    input,
  );
  return data;
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
  const { data } = await apiClient.get<{ items: HospitalDepartment[] }>(
    API.HOSPITAL_DEPARTMENTS,
  );
  return data.items;
}

export async function createHospitalDepartment(
  input: HospitalDepartmentInput,
): Promise<HospitalDepartment> {
  const { data } = await apiClient.post<HospitalDepartment>(
    API.HOSPITAL_DEPARTMENTS,
    input,
  );
  return data;
}

export async function updateHospitalDepartment(
  departmentId: string,
  input: HospitalDepartmentInput,
): Promise<HospitalDepartment> {
  const { data } = await apiClient.put<HospitalDepartment>(
    API.hospitalDepartment(departmentId),
    input,
  );
  return data;
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
  const { data } = await apiClient.get<{ items: HospitalDoctor[] }>(
    API.HOSPITAL_DOCTORS,
  );
  return data.items;
}

export async function createHospitalDoctor(input: HospitalDoctorInput): Promise<HospitalDoctor> {
  const { data } = await apiClient.post<HospitalDoctor>(API.HOSPITAL_DOCTORS, input);
  return data;
}

export async function updateHospitalDoctor(
  doctorId: string,
  input: HospitalDoctorInput,
): Promise<HospitalDoctor> {
  const { data } = await apiClient.put<HospitalDoctor>(
    API.hospitalDoctor(doctorId),
    input,
  );
  return data;
}

export type HospitalPayerType = 'SELF_PAY' | 'INSURANCE_TPA';

export type HospitalAdmissionStatus = 'ACTIVE' | 'DISCHARGED';

export interface HospitalAdmission {
  id: string;
  uhid: string;
  patientName: string;
  phone: string | null;
  age: number | null;
  gender: string | null;
  customerId: string | null;
  wardId: string;
  wardName: string;
  bedId: string;
  bedLabel: string;
  attendingDoctorId: string | null;
  attendingDoctorName: string | null;
  diagnosis: string | null;
  payerType: HospitalPayerType;
  insurerName: string | null;
  policyNumber: string | null;
  status: HospitalAdmissionStatus;
  admittedAt: string;
  version: number;
}

export type HospitalAdmissionInput = {
  patientName: string;
  uhid: string;
  wardId: string;
  bedId: string;
  phone?: string | null;
  age?: number | null;
  gender?: string | null;
  attendingDoctorId?: string | null;
  diagnosis?: string | null;
  payerType: HospitalPayerType;
  insurerName?: string | null;
  policyNumber?: string | null;
};

export async function getNextHospitalUhid(): Promise<string> {
  const { data } = await apiClient.get<{ nextUhid: string }>(
    API.HOSPITAL_ADMISSIONS_NEXT_UHID,
  );
  return data.nextUhid;
}

export async function listHospitalAdmissions(): Promise<HospitalAdmission[]> {
  const { data } = await apiClient.get<{ items: HospitalAdmission[] }>(
    API.HOSPITAL_ADMISSIONS,
  );
  return data.items;
}

export async function admitHospitalPatient(
  input: HospitalAdmissionInput,
): Promise<HospitalAdmission> {
  const { data } = await apiClient.post<HospitalAdmission>(
    API.HOSPITAL_ADMISSIONS,
    input,
  );
  return data;
}

export type HospitalIndentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ISSUED';

export interface HospitalIndentLine {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  requestedQty: number;
  issuedQty: number;
}

export interface HospitalIndent {
  id: string;
  indentNumber: string;
  wardId: string;
  wardName: string;
  bedId: string | null;
  bedLabel: string | null;
  patientName: string | null;
  note: string | null;
  requestedBy: string;
  requestedAt: string;
  status: HospitalIndentStatus;
  hospitalInvoiceRef: string | null;
  issuedAt: string | null;
  version: number;
  lines: HospitalIndentLine[];
}

export interface HospitalIndentList {
  pendingCount: number;
  approvedCount: number;
  issuedTodayCount: number;
  totalCount: number;
  items: HospitalIndent[];
}

export type HospitalIndentLineInput = {
  productId: string;
  quantity: number;
};

export type HospitalIndentInput = {
  wardId: string;
  bedId?: string | null;
  patientName?: string | null;
  note?: string | null;
  requestedBy: string;
  lines: HospitalIndentLineInput[];
};

export async function getHospitalIndents(status?: HospitalIndentStatus): Promise<HospitalIndentList> {
  const { data } = await apiClient.get<HospitalIndentList>(API.HOSPITAL_INDENTS, {
    params: status ? { status } : undefined,
  });
  return data;
}

export async function getHospitalIndent(indentId: string): Promise<HospitalIndent> {
  const { data } = await apiClient.get<HospitalIndent>(API.hospitalIndent(indentId));
  return data;
}

export async function createHospitalIndent(input: HospitalIndentInput): Promise<HospitalIndent> {
  const { data } = await apiClient.post<HospitalIndent>(API.HOSPITAL_INDENTS, input);
  return data;
}

export async function approveHospitalIndent(indentId: string): Promise<HospitalIndent> {
  const { data } = await apiClient.post<HospitalIndent>(
    API.hospitalIndentApprove(indentId),
  );
  return data;
}

export async function rejectHospitalIndent(indentId: string): Promise<HospitalIndent> {
  const { data } = await apiClient.post<HospitalIndent>(
    API.hospitalIndentReject(indentId),
  );
  return data;
}

export type HospitalIssueReason = 'FLOOR_STOCK' | 'CONSUMPTION' | 'PATIENT_REFILL';
export type HospitalIssueKind = 'ALL' | 'ISSUES' | 'REFILLS' | 'RETURNS';

export type HospitalIssueLine = {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  batchId: string | null;
  batchNumber: string | null;
  expiryOn: string | null;
  hsnCode: string | null;
  gstRate: number | null;
  quantity: number;
  mrpPaise: number;
  creditPricePaise: number;
  discountBps: number;
  amountPaise: number;
};

export type HospitalIssue = {
  id: string;
  invoiceNumber: string;
  wardId: string;
  wardName: string;
  indentId?: string | null;
  indentNumber?: string | null;
  reason: HospitalIssueReason;
  uhid?: string | null;
  patientName?: string | null;
  pharmacyGstin?: string | null;
  hospitalGstin?: string | null;
  creditTerms: string;
  mrpValuePaise: number;
  billedPaise: number;
  issuedAt: string;
  version: number;
  lines: HospitalIssueLine[];
};

export type HospitalIssueList = {
  items: HospitalIssue[];
};

export type HospitalIssueLineInput = {
  productId: string;
  batchId: string;
  quantity: number;
};

export type HospitalIssueInput = {
  wardId: string;
  indentId?: string | null;
  reason: HospitalIssueReason;
  uhid?: string | null;
  patientName?: string | null;
  idempotencyKey: string;
  lines: HospitalIssueLineInput[];
};

export async function getHospitalIssues(params?: {
  wardId?: string;
  kind?: HospitalIssueKind;
  q?: string;
}): Promise<HospitalIssueList> {
  const { data } = await apiClient.get<HospitalIssueList>(API.HOSPITAL_ISSUES, {
    params,
  });
  return data;
}

export async function getHospitalIssue(issueId: string): Promise<HospitalIssue> {
  const { data } = await apiClient.get<HospitalIssue>(API.hospitalIssue(issueId));
  return data;
}

export async function createHospitalIssue(input: HospitalIssueInput): Promise<HospitalIssue> {
  const { data } = await apiClient.post<HospitalIssue>(API.HOSPITAL_ISSUES, input);
  return data;
}

export async function downloadHospitalIssuePdf(issueId: string): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(API.hospitalIssuePdf(issueId), {
    responseType: 'blob',
  });
  return data;
}
