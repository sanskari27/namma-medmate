import { apiClient, ApiError, isApiError } from '@/services/axios';
import { API } from '@/libs/constants/api.const';
import type {
  DosageForm,
  Product,
  ProductUnit,
  ScheduleClassification,
} from '@/services/products';

export { ApiError, isApiError };

export interface SalesCatalogueItem {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  genericName: string | null;
  brandName: string | null;
  categoryId: string;
  categoryName: string | null;
  categoryIcon: string | null;
  dosageForm: DosageForm;
  prescriptionRequired: boolean;
  scheduleClassification: ScheduleClassification | null;
  controlledSubstance: boolean;
  baseUnit: ProductUnit;
  packSize: number;
  packUnit: ProductUnit;
  packDescription: string | null;
  rackLocation: string | null;
  reorderLevel: number | null;
  minimumStock: number | null;
  requiresBatchTracking: boolean;
  active: boolean;
  onHandQuantity: number;
  suggestedMrpPaise: number | null;
  suggestedSellingPaise: number | null;
}

export interface SalesCatalogueQuery {
  q?: string;
  categoryId?: string;
  barcode?: string;
}

export async function listSalesCatalogue(
  query?: SalesCatalogueQuery,
): Promise<SalesCatalogueItem[]> {
  const { data } = await apiClient.get<{ items: SalesCatalogueItem[] }>(API.SALES_CATALOGUE, {
    params: {
      q: query?.q?.trim() || undefined,
      categoryId: query?.categoryId || undefined,
      barcode: query?.barcode?.trim() || undefined,
    },
  });
  return data.items;
}

/** Map catalogue row into Product shape for draft lines / safety helpers. */
export function catalogueItemToProduct(item: SalesCatalogueItem): Product {
  return {
    id: item.id,
    tenantId: '',
    sku: item.sku,
    barcode: item.barcode,
    name: item.name,
    genericName: item.genericName,
    brandName: item.brandName,
    manufacturerId: null,
    categoryId: item.categoryId,
    categoryIcon: item.categoryIcon,
    productType: 'Medicine',
    dosageForm: item.dosageForm,
    therapeuticClass: null,
    composition: null,
    strength: null,
    route: null,
    prescriptionRequired: item.prescriptionRequired,
    scheduleClassification: item.scheduleClassification,
    hsnCode: null,
    gstRate: null,
    baseUnit: item.baseUnit,
    packSize: item.packSize,
    packUnit: item.packUnit,
    packDescription: item.packDescription,
    storageConditions: null,
    requiresColdStorage: false,
    rackLocation: item.rackLocation,
    reorderLevel: item.reorderLevel,
    reorderQuantity: null,
    minimumStock: item.minimumStock,
    isDiscontinued: false,
    isReturnable: true,
    isTaxable: true,
    taxCategory: null,
    requiresBatchTracking: item.requiresBatchTracking,
    requiresExpiryTracking: item.requiresBatchTracking,
    requiresSerialTracking: false,
    controlledSubstance: item.controlledSubstance,
    notes: null,
    isActive: item.active,
    createdAt: '',
    updatedAt: '',
  };
}
