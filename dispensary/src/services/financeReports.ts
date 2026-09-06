import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export { ApiError, isApiError };

export type FinanceReportCatalogItem = {
  key: string;
  title: string;
  filters: string[];
};

export type FinanceReportTotal = {
  key: string;
  label: string;
  amountPaise: number;
};

export type FinanceReportTable = {
  key: string;
  title: string;
  from: string;
  to: string;
  scope: string;
  branchId: string | null;
  totals: FinanceReportTotal[];
  columns: string[];
  items: Record<string, string>[];
  generatedAt: string;
};

export type FinanceReportQuery = {
  from?: string;
  to?: string;
  branchId?: string;
  scope?: string;
};

export async function listFinanceReports(
  query: FinanceReportQuery = {},
): Promise<FinanceReportCatalogItem[]> {
  const { data } = await apiClient.get<{ items: FinanceReportCatalogItem[] }>(API.FINANCE_REPORTS, {
    params: query,
  });
  return data.items;
}

export async function getFinanceReport(
  key: string,
  query: FinanceReportQuery = {},
): Promise<FinanceReportTable> {
  const { data } = await apiClient.get<FinanceReportTable>(API.financeReport(key), {
    params: query,
  });
  return data;
}

export async function downloadFinanceReport(
  key: string,
  format: 'csv' | 'pdf',
  query: FinanceReportQuery = {},
): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(API.financeReportExport(key), {
    params: { format, ...query },
    responseType: 'blob',
  });
  return data;
}
