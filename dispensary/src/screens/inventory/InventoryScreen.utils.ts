import { AlertCircle, BadgeCheck, Package, Unplug } from 'lucide-react';
import { isApiError } from '@/services/axios';
import type {
  DosageForm,
  Product,
  ProductInput,
  ProductRoute,
  ProductType,
  ProductUnit,
  ScheduleClassification,
} from '@/services/products';

export type PageStatus =
  'loading' | 'empty' | 'validation' | 'denied' | 'conflict' | 'failure' | 'success' | null;

export type FormState = {
  sku: string;
  barcode: string;
  name: string;
  genericName: string;
  brandName: string;
  manufacturerId: string;
  categoryId: string;
  productType: ProductType;
  dosageForm: DosageForm;
  therapeuticClass: string;
  composition: string;
  strength: string;
  route: string;
  prescriptionRequired: boolean;
  scheduleClassification: string;
  hsnCode: string;
  gstRate: string;
  baseUnit: ProductUnit;
  packSize: string;
  packUnit: ProductUnit;
  packDescription: string;
  storageConditions: string;
  requiresColdStorage: boolean;
  rackLocation: string;
  reorderLevel: string;
  reorderQuantity: string;
  minimumStock: string;
  isDiscontinued: boolean;
  isReturnable: boolean;
  isTaxable: boolean;
  taxCategory: string;
  requiresBatchTracking: boolean;
  requiresExpiryTracking: boolean;
  requiresSerialTracking: boolean;
  controlledSubstance: boolean;
  notes: string;
  isActive: boolean;
};

export const PRODUCT_TYPES: ProductType[] = ['Medicine', 'Device', 'Surgical', 'OTC', 'FMCG'];

export const DOSAGE_FORMS: DosageForm[] = [
  'Tablet',
  'Capsule',
  'Syrup',
  'Injection',
  'Cream',
  'Ointment',
  'Drop',
  'Inhaler',
  'Device',
  'Powder',
  'Suspension',
  'Gel',
  'Lotion',
  'Patch',
  'Other',
];

export const PRODUCT_ROUTES: ProductRoute[] = [
  'Oral',
  'IV',
  'IM',
  'SC',
  'Topical',
  'Inhalation',
  'Nasal',
  'Ophthalmic',
  'Otic',
  'Rectal',
  'Vaginal',
  'Transdermal',
  'Other',
];

export const SCHEDULES: ScheduleClassification[] = ['OTC', 'H', 'H1', 'X', 'NDPS'];

export const PRODUCT_UNITS: ProductUnit[] = [
  'Tablet',
  'Capsule',
  'ml',
  'L',
  'g',
  'mg',
  'piece',
  'vial',
  'strip',
  'bottle',
  'tube',
  'box',
  'pack',
  'unit',
];

export const emptyForm: FormState = {
  sku: '',
  barcode: '',
  name: '',
  genericName: '',
  brandName: '',
  manufacturerId: '',
  categoryId: '',
  productType: 'Medicine',
  dosageForm: 'Tablet',
  therapeuticClass: '',
  composition: '',
  strength: '',
  route: '',
  prescriptionRequired: false,
  scheduleClassification: '',
  hsnCode: '',
  gstRate: '',
  baseUnit: 'Tablet',
  packSize: '10',
  packUnit: 'strip',
  packDescription: '',
  storageConditions: '',
  requiresColdStorage: false,
  rackLocation: '',
  reorderLevel: '',
  reorderQuantity: '',
  minimumStock: '',
  isDiscontinued: false,
  isReturnable: true,
  isTaxable: true,
  taxCategory: '',
  requiresBatchTracking: false,
  requiresExpiryTracking: false,
  requiresSerialTracking: false,
  controlledSubstance: false,
  notes: '',
  isActive: true,
};

export function statusCopy(status: PageStatus): { icon: typeof AlertCircle; text: string } | null {
  switch (status) {
    case 'loading':
      return { icon: Package, text: 'Loading stock catalogue for this floor…' };
    case 'empty':
      return {
        icon: Package,
        text: 'No products yet. Add the first SKU for this pharmacy catalogue.',
      };
    case 'validation':
      return {
        icon: AlertCircle,
        text: 'SKU, name, category, type, dosage, pack size, and units are required. Check GST/HSN and tracking flags.',
      };
    case 'denied':
      return {
        icon: AlertCircle,
        text: 'This till login cannot open inventory. Ask the owner to grant the Inventory area.',
      };
    case 'conflict':
      return {
        icon: AlertCircle,
        text: 'That SKU is already on this pharmacy catalogue. Pick another code or edit the existing product.',
      };
    case 'failure':
      return { icon: Unplug, text: 'Could not reach the server for inventory. Try again.' };
    case 'success':
      return { icon: BadgeCheck, text: 'Product saved on this floor catalogue.' };
    default:
      return null;
  }
}

export function statusIconClass(status: PageStatus): string {
  if (status === 'success') {
    return 'text-brand';
  }
  if (status === 'conflict' || status === 'validation') {
    return 'text-warn';
  }
  if (status === 'failure' || status === 'denied') {
    return 'text-danger';
  }
  return 'text-brand';
}

export function hasInventoryAccess(modules: string[] | undefined): boolean {
  return modules?.includes('INVENTORY') === true;
}

export function toForm(product: Product): FormState {
  return {
    sku: product.sku,
    barcode: product.barcode ?? '',
    name: product.name,
    genericName: product.genericName ?? '',
    brandName: product.brandName ?? '',
    manufacturerId: product.manufacturerId ?? '',
    categoryId: product.categoryId,
    productType: product.productType,
    dosageForm: product.dosageForm,
    therapeuticClass: product.therapeuticClass ?? '',
    composition: product.composition ?? '',
    strength: product.strength ?? '',
    route: product.route ?? '',
    prescriptionRequired: product.prescriptionRequired,
    scheduleClassification: product.scheduleClassification ?? '',
    hsnCode: product.hsnCode ?? '',
    gstRate: product.gstRate == null ? '' : String(product.gstRate),
    baseUnit: product.baseUnit,
    packSize: String(product.packSize),
    packUnit: product.packUnit,
    packDescription: product.packDescription ?? '',
    storageConditions: product.storageConditions ?? '',
    requiresColdStorage: product.requiresColdStorage,
    rackLocation: product.rackLocation ?? '',
    reorderLevel: product.reorderLevel == null ? '' : String(product.reorderLevel),
    reorderQuantity: product.reorderQuantity == null ? '' : String(product.reorderQuantity),
    minimumStock: product.minimumStock == null ? '' : String(product.minimumStock),
    isDiscontinued: product.isDiscontinued,
    isReturnable: product.isReturnable,
    isTaxable: product.isTaxable,
    taxCategory: product.taxCategory ?? '',
    requiresBatchTracking: product.requiresBatchTracking,
    requiresExpiryTracking: product.requiresExpiryTracking,
    requiresSerialTracking: product.requiresSerialTracking,
    controlledSubstance: product.controlledSubstance,
    notes: product.notes ?? '',
    isActive: product.isActive,
  };
}

function optionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function optionalInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const n = Number(trimmed);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function optionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function validateForm(form: FormState): boolean {
  if (!form.sku.trim() || !form.name.trim() || !form.categoryId) {
    return false;
  }
  const packSize = Number(form.packSize);
  if (!Number.isFinite(packSize) || packSize <= 0) {
    return false;
  }
  if (form.gstRate.trim()) {
    const gst = Number(form.gstRate);
    if (![0, 5, 12, 18, 28].includes(gst)) {
      return false;
    }
  }
  if (form.hsnCode.trim() && !/^\d{4,8}$/.test(form.hsnCode.trim())) {
    return false;
  }
  if (form.requiresExpiryTracking && !form.requiresBatchTracking) {
    return false;
  }
  if (
    form.requiresSerialTracking &&
    form.productType !== 'Device' &&
    form.productType !== 'Surgical'
  ) {
    return false;
  }
  return true;
}

export function mapApiStatus(error: unknown): PageStatus {
  if (!isApiError(error)) {
    return 'failure';
  }
  if (error.status === 403 || error.code === 'FORBIDDEN') {
    return 'denied';
  }
  if (error.code === 'SKU_TAKEN' || error.status === 409) {
    return 'conflict';
  }
  if (error.code === 'VALIDATION_ERROR' || error.status === 400 || error.status === 422) {
    return 'validation';
  }
  return 'failure';
}

export function toInput(form: FormState): ProductInput {
  return {
    sku: form.sku.trim(),
    barcode: optionalText(form.barcode),
    name: form.name.trim(),
    genericName: optionalText(form.genericName),
    brandName: optionalText(form.brandName),
    manufacturerId: form.manufacturerId || null,
    categoryId: form.categoryId,
    productType: form.productType,
    dosageForm: form.dosageForm,
    therapeuticClass: optionalText(form.therapeuticClass),
    composition: optionalText(form.composition),
    strength: optionalText(form.strength),
    route: (form.route || null) as ProductRoute | null,
    prescriptionRequired: form.prescriptionRequired,
    scheduleClassification: (form.scheduleClassification || null) as ScheduleClassification | null,
    hsnCode: optionalText(form.hsnCode),
    gstRate: optionalNumber(form.gstRate),
    baseUnit: form.baseUnit,
    packSize: Number(form.packSize),
    packUnit: form.packUnit,
    packDescription: optionalText(form.packDescription),
    storageConditions: optionalText(form.storageConditions),
    requiresColdStorage: form.requiresColdStorage,
    rackLocation: optionalText(form.rackLocation),
    reorderLevel: optionalInt(form.reorderLevel),
    reorderQuantity: optionalInt(form.reorderQuantity),
    minimumStock: optionalInt(form.minimumStock),
    isDiscontinued: form.isDiscontinued,
    isReturnable: form.isReturnable,
    isTaxable: form.isTaxable,
    taxCategory: optionalText(form.taxCategory),
    requiresBatchTracking: form.requiresBatchTracking,
    requiresExpiryTracking: form.requiresExpiryTracking,
    requiresSerialTracking: form.requiresSerialTracking,
    controlledSubstance: form.controlledSubstance,
    notes: optionalText(form.notes),
    isActive: form.isActive,
  };
}
