import { createE2eTest } from '@namma-medmate/e2e-kit';
import { ManageUsersPage } from '../screens/list/list.page.ts';
import { UserDrawerPage } from '../screens/drawer/drawer.page.ts';

export const test = createE2eTest({
  listPage: ManageUsersPage,
  drawerPage: UserDrawerPage,
});

export { expect } from '@namma-medmate/e2e-kit';
