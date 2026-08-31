export const GST_DEALER_TYPE_REGULAR = 'regular' as const;
export const BUSINESS_TYPE_RETAIL = 'retail' as const;

export type GstDealerType = typeof GST_DEALER_TYPE_REGULAR;
export type BusinessType = typeof BUSINESS_TYPE_RETAIL;

export interface PharmacyRecord {
  tenantId: string;
  gstDealerType: GstDealerType;
  businessType: BusinessType;
  createdAt: Date;
  updatedAt: Date;
}

export interface LocationRecord {
  locationId: string;
  tenantId: string;
  displayName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PharmacyWithLocation extends PharmacyRecord {
  location: LocationRecord;
}

export interface PharmacyListItem {
  tenantId: string;
  locationId: string;
  displayName: string;
}

export interface CreatePharmacyInput {
  displayName: string;
  gstDealerType: GstDealerType;
  businessType: BusinessType;
}

export interface UpdateDisplayNameInput {
  tenantId: string;
  locationId: string;
  displayName: string;
}

export interface ListPharmaciesInput {
  limit: number;
  cursor?: string;
}

export interface ListPharmaciesResult {
  items: PharmacyListItem[];
  nextCursor: string | null;
}

export interface TenancyRepository {
  createPharmacyWithLocation(input: CreatePharmacyInput): Promise<PharmacyWithLocation>;
  getPharmacyByTenantId(tenantId: string): Promise<PharmacyWithLocation | undefined>;
  listPharmacies(input: ListPharmaciesInput): Promise<ListPharmaciesResult>;
  getLocationById(locationId: string): Promise<LocationRecord | undefined>;
  getLocationForTenant(tenantId: string): Promise<LocationRecord | undefined>;
  updateLocationDisplayName(input: UpdateDisplayNameInput): Promise<PharmacyWithLocation>;
}
