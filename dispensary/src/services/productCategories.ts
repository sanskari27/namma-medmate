import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export { ApiError, isApiError };

export interface ProductCategory {
  id: string;
  tenantId: string;
  name: string;
  icon: string | null;
  createdAt: string;
  updatedAt: string;
}

export const CATEGORY_ICON_PRESETS = [
  '💊',
  '🧴',
  '💉',
  '🩹',
  '🩺',
  '❤️',
  '🧠',
  '🦴',
  '👁️',
  '🦷',
  '🌿',
  '👶',
  '🧬',
  '🧪',
  '🏥',
  '😷',
  '💪',
  '🩸',
] as const;

export async function listProductCategories(): Promise<ProductCategory[]> {
  const { data } = await apiClient.get<{ items: ProductCategory[] }>(API.PRODUCT_CATEGORIES);
  return data.items;
}

export async function createProductCategory(
  name: string,
  icon?: string | null,
): Promise<ProductCategory> {
  const { data } = await apiClient.post<ProductCategory>(API.PRODUCT_CATEGORIES, {
    name,
    icon: icon?.trim() || null,
  });
  return data;
}
