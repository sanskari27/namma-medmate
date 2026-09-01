import { createE2eTest } from '@namma-medmate/e2e-kit';
import { EmployeesListPage } from '../screens/list/list.page.ts';
import { EmployeesLockPage } from '../screens/lock/lock.page.ts';
import { EmployeesDrawerPage } from '../screens/drawer/drawer.page.ts';

export const test = createE2eTest({
  listPage: EmployeesListPage,
  lockPage: EmployeesLockPage,
  drawerPage: EmployeesDrawerPage,
});

export { expect } from '@namma-medmate/e2e-kit';
