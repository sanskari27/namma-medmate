import { apiClient } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export type LicenseDocType = 'DRUG_LICENSE' | 'GST' | 'FSSAI' | 'PHARMACIST_REGISTRATION';
export type LicenseScope = 'TENANT' | 'BRANCH' | 'STAFF';

export interface AdminDueLicense {
  id: string;
  tenantId: string;
  tenantName: string;
  branchId: string | null;
  branchName: string | null;
  staffUserId: string | null;
  staffDisplayName: string | null;
  docType: LicenseDocType;
  scope: LicenseScope;
  licenseNumber: string;
  issuedOn: string;
  expiresOn: string;
  due: boolean;
}

export async function listPlatformDueLicenses(): Promise<AdminDueLicense[]> {
  const { data } = await apiClient.get<{ items: AdminDueLicense[] }>(
    API.ADMIN_COMPLIANCE_LICENSES_DUE,
  );
  return data.items;
}
