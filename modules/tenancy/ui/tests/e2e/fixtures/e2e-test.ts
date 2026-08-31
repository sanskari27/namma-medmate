import { createE2eTest } from '@namma-medmate/e2e-kit';
import { ShopIdentityBadgePage } from '../screens/shop-identity-badge/shop-identity-badge.page.ts';
import { CreatePharmacyFieldsPage } from '../screens/create-pharmacy-fields/create-pharmacy-fields.page.ts';

export const test = createE2eTest({
  shopIdentityPage: ShopIdentityBadgePage,
  createPharmacyPage: CreatePharmacyFieldsPage,
});

export { expect } from '@namma-medmate/e2e-kit';
