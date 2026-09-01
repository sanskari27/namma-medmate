import type { EmployeesDrawerPage } from './drawer.page.ts';

export async function openEmployeeDrawer({
  drawerPage,
}: {
  drawerPage: EmployeesDrawerPage;
}): Promise<void> {
  await drawerPage.gotoDrawer();
}
