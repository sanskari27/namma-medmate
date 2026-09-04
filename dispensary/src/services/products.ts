import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';

export { ApiError, isApiError };

export type ProductType = 'Medicine' | 'Device' | 'Surgical' | 'OTC' | 'FMCG';

export type DosageForm =
  | 'Tablet'
  | 'Capsule'
  | 'Syrup'
  | 'Injection'
  | 'Cream'
  | 'Ointment'
  | 'Drop'
  | 'Inhaler'
  | 'Device'
  | 'Powder'
  | 'Suspension'
  | 'Gel'
  | 'Lotion'
  | 'Patch'
  | 'Other';

export type ProductRoute =
  | 'Oral'
  | 'IV'
  | 'IM'
  | 'SC'
  | 'Topical'
  | 'Inhalation'
  | 'Nasal'
  | 'Ophthalmic'
  | 'Otic'
  | 'Rectal'
  | 'Vaginal'
  | 'Transdermal'
  | 'Other';

export type ScheduleClassification = 'OTC' | 'H' | 'H1' | 'X' | 'NDPS';

export type ProductUnit =
  | 'Tablet'
  | 'Capsule'
  | 'ml'
  | 'L'
  | 'g'
  | 'mg'
  | 'piece'
  | 'vial'
  | 'strip'
  | 'bottle'
  | 'tube'
  | 'box'
  | 'pack'
  | 'unit';

export interface Product {
  id: string;
  tenantId: string;
  sku: string;
  barcode: string | null;
  name: string;
  genericName: string | null;
  brandName: string | null;
  manufacturerId: string | null;
  categoryId: string;
  productType: ProductType;
  dosageForm: DosageForm;
  therapeuticClass: string | null;
  composition: string | null;
  strength: string | null;
  route: ProductRoute | null;
  prescriptionRequired: boolean;
  scheduleClassification: ScheduleClassification | null;
  hsnCode: string | null;
  gstRate: number | null;
  baseUnit: ProductUnit;
  packSize: number;
  packUnit: ProductUnit;
  packDescription: string | null;
  storageConditions: string | null;
  requiresColdStorage: boolean;
  rackLocation: string | null;
  reorderLevel: number | null;
  reorderQuantity: number | null;
  minimumStock: number | null;
  isDiscontinued: boolean;
  isReturnable: boolean;
  isTaxable: boolean;
  taxCategory: string | null;
  requiresBatchTracking: boolean;
  requiresExpiryTracking: boolean;
  requiresSerialTracking: boolean;
  controlledSubstance: boolean;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductInput {
  sku: string;
  barcode?: string | null;
  name: string;
  genericName?: string | null;
  brandName?: string | null;
  manufacturerId?: string | null;
  categoryId: string;
  productType: ProductType;
  dosageForm: DosageForm;
  therapeuticClass?: string | null;
  composition?: string | null;
  strength?: string | null;
  route?: ProductRoute | null;
  prescriptionRequired: boolean;
  scheduleClassification?: ScheduleClassification | null;
  hsnCode?: string | null;
  gstRate?: number | null;
  baseUnit: ProductUnit;
  packSize: number;
  packUnit: ProductUnit;
  packDescription?: string | null;
  storageConditions?: string | null;
  requiresColdStorage: boolean;
  rackLocation?: string | null;
  reorderLevel?: number | null;
  reorderQuantity?: number | null;
  minimumStock?: number | null;
  isDiscontinued?: boolean;
  isReturnable?: boolean;
  isTaxable?: boolean;
  taxCategory?: string | null;
  requiresBatchTracking?: boolean;
  requiresExpiryTracking?: boolean;
  requiresSerialTracking?: boolean;
  controlledSubstance?: boolean;
  notes?: string | null;
  isActive: boolean;
}

export async function listProducts(q?: string): Promise<Product[]> {
  const { data } = await apiClient.get<{ items: Product[] }>(API.PRODUCTS, {
    params: q ? { q } : undefined,
  });
  return data.items;
}

export async function getProduct(id: string): Promise<Product> {
  const { data } = await apiClient.get<Product>(API.product(id));
  return data;
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const { data } = await apiClient.post<Product>(API.PRODUCTS, input);
  return data;
}

export async function updateProduct(id: string, input: ProductInput): Promise<Product> {
  const { data } = await apiClient.patch<Product>(API.product(id), input);
  return data;
}
