import { apiClient } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export type LicenseDocType = 'DRUG_LICENSE' | 'GST' | 'FSSAI' | 'PHARMACIST_REGISTRATION';
export type LicenseScope = 'TENANT' | 'BRANCH' | 'STAFF';

export interface LicenseEvidence {
  id: string;
  licenseNumber: string;
  issuedOn: string;
  expiresOn: string;
  contentType: string;
  byteSize: number;
  uploadedAt: string;
}

export interface ComplianceLicense {
  id: string;
  tenantId: string;
  branchId: string | null;
  staffUserId: string | null;
  docType: LicenseDocType;
  scope: LicenseScope;
  licenseNumber: string;
  issuedOn: string;
  expiresOn: string;
  currentEvidenceId: string | null;
  version: number;
  due: boolean;
  evidence: LicenseEvidence[];
}

export interface LicenseWriteInput {
  docType: LicenseDocType;
  scope: LicenseScope;
  branchId?: string;
  staffUserId?: string;
  licenseNumber: string;
  issuedOn: string;
  expiresOn: string;
  evidence: File;
}

export async function listLicenses(): Promise<{ items: ComplianceLicense[] }> {
  const { data } = await apiClient.get<{ items: ComplianceLicense[] }>(API.COMPLIANCE_LICENSES);
  return data;
}

export async function listDueLicenses(): Promise<{ items: ComplianceLicense[] }> {
  const { data } = await apiClient.get<{ items: ComplianceLicense[] }>(API.COMPLIANCE_LICENSES_DUE);
  return data;
}

export function licenseEvidenceUrl(licenseId: string, evidenceId: string): string {
  const base = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080').replace(/\/$/, '');
  return `${base}${API.licenseEvidence(licenseId, evidenceId)}`;
}

export async function createLicense(input: LicenseWriteInput): Promise<ComplianceLicense> {
  const body = toFormData(input);
  const { data } = await apiClient.post<ComplianceLicense>(API.COMPLIANCE_LICENSES, body);
  return data;
}

export async function renewLicense(
  id: string,
  input: Pick<LicenseWriteInput, 'licenseNumber' | 'issuedOn' | 'expiresOn' | 'evidence'> & {
    expectedVersion: number;
  },
): Promise<ComplianceLicense> {
  const body = new FormData();
  body.append('licenseNumber', input.licenseNumber);
  body.append('issuedOn', input.issuedOn);
  body.append('expiresOn', input.expiresOn);
  body.append('expectedVersion', String(input.expectedVersion));
  body.append('evidence', input.evidence);
  const { data } = await apiClient.post<ComplianceLicense>(API.licenseRenew(id), body);
  return data;
}

function toFormData(input: LicenseWriteInput): FormData {
  const body = new FormData();
  body.append('docType', input.docType);
  body.append('scope', input.scope);
  if (input.branchId) {
    body.append('branchId', input.branchId);
  }
  if (input.staffUserId) {
    body.append('staffUserId', input.staffUserId);
  }
  body.append('licenseNumber', input.licenseNumber);
  body.append('issuedOn', input.issuedOn);
  body.append('expiresOn', input.expiresOn);
  body.append('evidence', input.evidence);
  return body;
}
