import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export { ApiError, isApiError };

export type CustomReportField = {
  key: string;
  label: string;
  kind: string;
};

export type CustomReportDataset = {
  key: string;
  label: string;
  fields: CustomReportField[];
};

export type CustomReportOperator = {
  key: string;
  label: string;
};

export type CustomReportCatalog = {
  datasets: CustomReportDataset[];
  operators: CustomReportOperator[];
};

export type CustomReportFilter = {
  field: string;
  operator: string;
  value: string;
};

export type CustomReportQuery = {
  dataset: string;
  columns: string[];
  filters: CustomReportFilter[];
  from: string;
  to: string;
  scope?: string;
  branchId?: string;
};

export type CustomReportPreview = {
  dataset: string;
  from: string;
  to: string;
  scope: string;
  branchId: string | null;
  columns: string[];
  items: Record<string, string>[];
  rowCount: number;
  truncated: boolean;
  generatedAt: string;
};

export async function getCustomReportCatalog(): Promise<CustomReportCatalog> {
  const { data } = await apiClient.get<CustomReportCatalog>(API.CUSTOM_REPORTS);
  return data;
}

export async function previewCustomReport(query: CustomReportQuery): Promise<CustomReportPreview> {
  const { data } = await apiClient.post<CustomReportPreview>(API.CUSTOM_REPORT_PREVIEW, query);
  return data;
}

export async function downloadCustomReport(
  query: CustomReportQuery,
  format: 'csv' | 'pdf',
): Promise<Blob> {
  const { data } = await apiClient.post<Blob>(API.CUSTOM_REPORT_EXPORT, query, {
    params: { format },
    responseType: 'blob',
  });
  return data;
}
