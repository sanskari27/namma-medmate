import type { CreatePharmacyFieldsPage } from './create-pharmacy-fields.page.ts';

export async function openCreatePharmacyForm({
  createPharmacyPage,
}: {
  createPharmacyPage: CreatePharmacyFieldsPage;
}): Promise<void> {
  await createPharmacyPage.goto();
}

export async function expectCreatePharmacyForm({
  createPharmacyPage,
}: {
  createPharmacyPage: CreatePharmacyFieldsPage;
}): Promise<void> {
  await createPharmacyPage.expectReady();
}
