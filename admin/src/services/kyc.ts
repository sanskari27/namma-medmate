import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export { ApiError, isApiError };

export interface KycDocumentItem {
  id: string;
  docType: string;
  contentType: string;
  byteSize: number;
  originalFilename: string;
}

export interface KycPack {
  id: string;
  tenantId: string;
  tenantName: string;
  legalName: string;
  drugLicenseNumber: string;
  pan: string;
  gstin: string | null;
  addressLine1: string;
  city: string;
  state: string;
  pincode: string;
  contactPhone: string;
  status: string;
  rejectionReason: string | null;
  submittedAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  version: number;
  documents: KycDocumentItem[];
}

export async function listKycQueue(): Promise<KycPack[]> {
  const { data } = await apiClient.get<{ items: KycPack[] }>(API.ADMIN_KYC);
  return data.items;
}

export async function getKycPack(id: string): Promise<KycPack> {
  const { data } = await apiClient.get<KycPack>(`${API.ADMIN_KYC}/${id}`);
  return data;
}

export async function approveKycPack(id: string): Promise<KycPack> {
  const { data } = await apiClient.post<KycPack>(`${API.ADMIN_KYC}/${id}/approve`);
  return data;
}

export async function rejectKycPack(id: string, reason: string): Promise<KycPack> {
  const { data } = await apiClient.post<KycPack>(`${API.ADMIN_KYC}/${id}/reject`, { reason });
  return data;
}

export function kycDocumentUrl(packId: string, documentId: string): string {
  const base = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080').replace(/\/$/, '');
  return `${base}${API.ADMIN_KYC}/${packId}/documents/${documentId}`;
}
