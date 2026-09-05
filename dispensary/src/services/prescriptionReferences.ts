import { apiClient } from './axios';
import { API } from '@/libs/constants/api.const';

export type PrescriptionReferenceStatus = 'ACTIVE' | 'ARCHIVED';
export type PrescriptionArchiveReason = 'EXPIRED' | 'FULFILLED';

export type PrescriptionSourceInvoice = {
  id: string;
  invoiceNumber: string;
  branchId: string;
  completedAt: string | null;
  totalPaise: number;
};

export type PrescriptionReference = {
  id: string;
  tenantId: string;
  branchId: string;
  branchName: string;
  customerId: string;
  customerName: string;
  doctorId: string | null;
  prescriptionReference: string;
  issuedAt: string;
  expiresAt: string;
  status: PrescriptionReferenceStatus;
  archiveReason: PrescriptionArchiveReason | null;
  archivedAt: string | null;
  firstInvoiceId: string | null;
  version: number;
  invoices: PrescriptionSourceInvoice[];
};

export async function listPrescriptionReferences(
  status?: PrescriptionReferenceStatus,
): Promise<{ items: PrescriptionReference[] }> {
  const { data } = await apiClient.get<{ items: PrescriptionReference[] }>(
    API.PRESCRIPTION_REFERENCES,
    { params: status ? { status } : undefined },
  );
  return data;
}

export async function getPrescriptionReference(id: string): Promise<PrescriptionReference> {
  const { data } = await apiClient.get<PrescriptionReference>(API.prescriptionReference(id));
  return data;
}

export async function archivePrescriptionReference(
  id: string,
  expectedVersion: number,
): Promise<PrescriptionReference> {
  const { data } = await apiClient.post<PrescriptionReference>(
    API.prescriptionReferenceArchive(id),
    { expectedVersion },
  );
  return data;
}

export async function scanPrescriptionReferences(): Promise<{ archived: number }> {
  const { data } = await apiClient.post<{ archived: number }>(API.PRESCRIPTION_REFERENCES_SCAN);
  return data;
}
