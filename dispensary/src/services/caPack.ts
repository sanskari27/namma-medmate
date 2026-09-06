import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export { ApiError, isApiError };

export type CaPackTotal = {
  key: string;
  label: string;
  amountPaise: number;
};

export type CaPackSection = {
  key: string;
  title: string;
  totals: CaPackTotal[];
  columns: string[];
  items: Record<string, string>[];
};

export type CaPack = {
  from: string;
  to: string;
  scope: string;
  branchId: string | null;
  generatedAt: string;
  sections: CaPackSection[];
};

export type CaPackQuery = {
  from?: string;
  to?: string;
  branchId?: string;
  scope?: string;
};

export async function getCaPack(query: CaPackQuery = {}): Promise<CaPack> {
  const { data } = await apiClient.get<CaPack>(API.FINANCE_CA_PACK, { params: query });
  return data;
}

export async function downloadCaPack(query: CaPackQuery = {}): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(API.FINANCE_CA_PACK_EXPORT, {
    params: { format: 'pdf', ...query },
    responseType: 'blob',
  });
  return data;
}
