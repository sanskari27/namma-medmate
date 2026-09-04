import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export { ApiError, isApiError };

export interface ProductCategory {
  id: string;
  tenantId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export async function listProductCategories(): Promise<ProductCategory[]> {
  const { data } = await apiClient.get<{ items: ProductCategory[] }>(API.PRODUCT_CATEGORIES);
  return data.items;
}

export async function createProductCategory(name: string): Promise<ProductCategory> {
  const { data } = await apiClient.post<ProductCategory>(API.PRODUCT_CATEGORIES, { name });
  return data;
}
