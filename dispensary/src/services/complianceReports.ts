import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export { ApiError, isApiError };

export type ComplianceReportCatalogItem = {
  key: string;
  title: string;
  filters: string[];
  entitled?: boolean;
  minPlan?: string;
  upgradeHint?: string | null;
};

export type ComplianceReportTable = {
  key: string;
  title: string;
  columns: string[];
  items: Record<string, string>[];
  generatedAt: string;
};

export type ComplianceReportQuery = {
  from?: string;
  to?: string;
  productId?: string;
  supplierId?: string;
  batchNumber?: string;
};

export async function listComplianceReports(): Promise<ComplianceReportCatalogItem[]> {
  const { data } = await apiClient.get<{ items: ComplianceReportCatalogItem[] }>(
    API.COMPLIANCE_REPORTS,
  );
  return data.items;
}

export async function getComplianceReport(
  key: string,
  query: ComplianceReportQuery = {},
): Promise<ComplianceReportTable> {
  const { data } = await apiClient.get<ComplianceReportTable>(API.complianceReport(key), {
    params: query,
  });
  return data;
}

export async function downloadComplianceReport(
  key: string,
  format: 'csv' | 'pdf',
  query: ComplianceReportQuery = {},
): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(API.complianceReportExport(key), {
    params: { format, ...query },
    responseType: 'blob',
  });
  return data;
}
