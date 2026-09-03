import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export { ApiError, isApiError };

export interface TenantRegistrationResult {
  tenantId: string;
  email: string;
}

export interface TenantVerifyResult {
  tenantId: string;
  email: string;
}

export interface KycDocumentItem {
  id: string;
  docType: string;
  contentType: string;
  byteSize: number;
  originalFilename: string;
}

export interface KycStatus {
  tenantId: string;
  tenantStatus: string;
  emailVerified: boolean;
  status: 'SUBMITTED' | 'REJECTED' | 'APPROVED' | null;
  rejectionReason: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  submissionId: string | null;
  documents: KycDocumentItem[];
}

export interface KycSubmitInput {
  legalName: string;
  drugLicenseNumber: string;
  pan: string;
  gstin?: string;
  addressLine1: string;
  city: string;
  state: string;
  pincode: string;
  contactPhone: string;
  drugLicense: File;
  panDocument: File;
  gstCertificate?: File;
}

export async function registerPharmacy(input: {
  businessName: string;
  email: string;
  phone: string;
  password: string;
}): Promise<TenantRegistrationResult> {
  const { data } = await apiClient.post<TenantRegistrationResult>(API.TENANTS_REGISTER, input);
  return data;
}

export async function verifyPharmacyEmail(token: string): Promise<TenantVerifyResult> {
  const { data } = await apiClient.post<TenantVerifyResult>(API.TENANTS_VERIFY_EMAIL, { token });
  return data;
}

export async function getKycStatus(tenantId: string): Promise<KycStatus> {
  const { data } = await apiClient.get<KycStatus>(API.tenantKyc(tenantId));
  return data;
}

export async function submitKyc(tenantId: string, input: KycSubmitInput): Promise<KycStatus> {
  const body = new FormData();
  body.append('legalName', input.legalName);
  body.append('drugLicenseNumber', input.drugLicenseNumber);
  body.append('pan', input.pan);
  if (input.gstin) {
    body.append('gstin', input.gstin);
  }
  body.append('addressLine1', input.addressLine1);
  body.append('city', input.city);
  body.append('state', input.state);
  body.append('pincode', input.pincode);
  body.append('contactPhone', input.contactPhone);
  body.append('drugLicense', input.drugLicense);
  body.append('panDocument', input.panDocument);
  if (input.gstCertificate) {
    body.append('gstCertificate', input.gstCertificate);
  }
  const { data } = await apiClient.post<KycStatus>(API.tenantKyc(tenantId), body);
  return data;
}
