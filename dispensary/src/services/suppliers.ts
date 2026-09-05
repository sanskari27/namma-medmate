import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export { ApiError, isApiError };

export type SupplierType = 'DISTRIBUTOR' | 'WHOLESALER' | 'MANUFACTURER' | 'SUPER_STOCKIST';
export type SupplierStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
export type SupplierPaymentTerms = 'COD' | 'ADVANCE' | 'CREDIT';
export type DrugLicenseType = 'WHOLESALE' | 'RETAIL' | 'MANUFACTURING';
export type SupplierLicenseStatus = 'MISSING' | 'VALID' | 'EXPIRING' | 'EXPIRED';

export interface PurchaseOrderSummary {
  id: string;
  poNumber: string;
  placedAt: string;
}

export interface BranchProcurement {
  branchId: string | null;
  branchName: string | null;
  purchaseOrders: PurchaseOrderSummary[];
}

export interface Supplier {
  id: string;
  tenantId: string;
  supplierCode: string;
  legalName: string;
  tradeName: string | null;
  supplierType: SupplierType;
  gstin: string | null;
  pan: string | null;
  drugLicenseNumber: string | null;
  drugLicenseType: DrugLicenseType | null;
  drugLicenseExpiry: string | null;
  fssaiLicenseNumber: string | null;
  licenseStatus: SupplierLicenseStatus;
  contactPersonName: string;
  contactPersonRole: string | null;
  phone: string;
  alternatePhone: string | null;
  email: string | null;
  website: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  paymentTerms: SupplierPaymentTerms;
  creditPeriodDays: number | null;
  creditLimitPaise: number | null;
  bankName: string | null;
  accountHolderName: string | null;
  accountNumber: string | null;
  ifscCode: string | null;
  upiId: string | null;
  categoryIds: string[];
  status: SupplierStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  branchProcurement: BranchProcurement;
}

export interface SupplierInput {
  supplierCode: string;
  legalName: string;
  tradeName?: string;
  supplierType: SupplierType;
  gstin?: string;
  pan?: string;
  drugLicenseNumber?: string;
  drugLicenseType?: DrugLicenseType | null;
  drugLicenseExpiry?: string;
  fssaiLicenseNumber?: string;
  contactPersonName: string;
  contactPersonRole?: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  website?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
  paymentTerms: SupplierPaymentTerms;
  creditPeriodDays?: number;
  creditLimitPaise?: number;
  bankName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  confirmAccountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  categoryIds: string[];
  status: SupplierStatus;
  notes?: string;
}

export async function listSuppliers(q?: string): Promise<Supplier[]> {
  const { data } = await apiClient.get<{ items: Supplier[] }>(API.SUPPLIERS, {
    params: q ? { q } : undefined,
  });
  return data.items;
}

export async function getSupplier(id: string): Promise<Supplier> {
  const { data } = await apiClient.get<Supplier>(API.supplier(id));
  return data;
}

export async function createSupplier(input: SupplierInput): Promise<Supplier> {
  const { data } = await apiClient.post<Supplier>(API.SUPPLIERS, input);
  return data;
}

export async function updateSupplier(id: string, input: SupplierInput): Promise<Supplier> {
  const { data } = await apiClient.patch<Supplier>(API.supplier(id), input);
  return data;
}
