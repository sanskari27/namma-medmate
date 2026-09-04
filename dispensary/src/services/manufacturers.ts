import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export { ApiError, isApiError };

export interface Manufacturer {
  id: string;
  tenantId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export async function listManufacturers(): Promise<Manufacturer[]> {
  const { data } = await apiClient.get<{ items: Manufacturer[] }>(API.MANUFACTURERS);
  return data.items;
}

export async function createManufacturer(name: string): Promise<Manufacturer> {
  const { data } = await apiClient.post<Manufacturer>(API.MANUFACTURERS, { name });
  return data;
}
