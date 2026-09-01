import { createE2eTest } from '@namma-medmate/e2e-kit';
import { AddMedicineModalPage } from '../screens/add-modal/add-modal.page.ts';
import { MasterCatalogueDrawerPage } from '../screens/drawer/drawer.page.ts';
import { MasterCatalogueListPage } from '../screens/list/list.page.ts';

export const test = createE2eTest({
  listPage: MasterCatalogueListPage,
  drawerPage: MasterCatalogueDrawerPage,
  addModalPage: AddMedicineModalPage,
});

export { expect } from '@namma-medmate/e2e-kit';
