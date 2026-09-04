import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';
import type { ProductUnit } from '@/services/products';

export { ApiError, isApiError };

export interface ProductUnitConversion {
  unit: ProductUnit;
  factorToBase: number;
  version: number;
}

export interface ProductUnits {
  baseUnit: ProductUnit;
  quantityPrecision: number;
  units: ProductUnitConversion[];
}

export interface ProductUnitConvertResult {
  quantity: number;
  unit: ProductUnit;
  baseQuantity: number;
  baseUnit: ProductUnit;
  displayQuantity: number;
  displayUnit: ProductUnit;
  conversionVersion: number | null;
  factorToBase: number;
}

export async function listProductUnits(productId: string): Promise<ProductUnits> {
  const { data } = await apiClient.get<{ data: ProductUnits }>(API.productUnits(productId));
  return data.data;
}

export async function replaceProductUnits(
  productId: string,
  input: {
    quantityPrecision: number;
    units: Array<{ unit: ProductUnit; factorToBase: number }>;
  },
): Promise<ProductUnits> {
  const { data } = await apiClient.put<{ data: ProductUnits }>(API.productUnits(productId), input);
  return data.data;
}

export async function convertProductUnit(
  productId: string,
  input: { quantity: number; fromUnit: ProductUnit; toUnit?: ProductUnit },
): Promise<ProductUnitConvertResult> {
  const { data } = await apiClient.post<{ data: ProductUnitConvertResult }>(
    API.productUnitsConvert(productId),
    input,
  );
  return data.data;
}
