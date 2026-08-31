import type { PharmacyWithLocation } from '@namma-medmate/db-services';

export function toCreatedPharmacy(record: PharmacyWithLocation) {
  return {
    tenant_id: record.tenantId,
    location_id: record.location.locationId,
    display_name: record.location.displayName,
    gst_dealer_type: record.gstDealerType,
    business_type: record.businessType,
    created_at: record.createdAt.toISOString(),
  };
}

export function toPharmacy(record: PharmacyWithLocation) {
  return {
    tenant_id: record.tenantId,
    gst_dealer_type: record.gstDealerType,
    business_type: record.businessType,
    location: {
      location_id: record.location.locationId,
      tenant_id: record.location.tenantId,
      display_name: record.location.displayName,
    },
    created_at: record.createdAt.toISOString(),
    updated_at: record.updatedAt.toISOString(),
  };
}

export function toLocationIdentity(record: PharmacyWithLocation['location']) {
  return {
    tenant_id: record.tenantId,
    location_id: record.locationId,
    display_name: record.displayName,
  };
}
