import { BUSINESS_TYPE_RETAIL, GST_DEALER_TYPE_REGULAR } from '@namma-medmate/db-services';

export const LOCAL_SEED_TENANT_ID = '8f1c0a7e-2b3d-4e5f-8a90-123456789abc';
export const LOCAL_SEED_LOCATION_ID = '1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809';
export const LOCAL_SEED_OWNER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
export const LOCAL_SEED_SHOP_NAME = 'Sri Krishna Medicals';

export function localSeedPharmacy() {
  const now = new Date();
  return {
    tenantId: LOCAL_SEED_TENANT_ID,
    gstDealerType: GST_DEALER_TYPE_REGULAR,
    businessType: BUSINESS_TYPE_RETAIL,
    createdAt: now,
    updatedAt: now,
    location: {
      locationId: LOCAL_SEED_LOCATION_ID,
      tenantId: LOCAL_SEED_TENANT_ID,
      displayName: LOCAL_SEED_SHOP_NAME,
      createdAt: now,
      updatedAt: now,
    },
  };
}
