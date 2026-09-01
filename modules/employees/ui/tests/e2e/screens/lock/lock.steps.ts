import type { EmployeesLockPage } from './lock.page.ts';

export async function openPlanLock({ lockPage }: { lockPage: EmployeesLockPage }): Promise<void> {
  await lockPage.gotoLock();
}

export async function expectStarterLock({
  lockPage,
}: {
  lockPage: EmployeesLockPage;
}): Promise<void> {
  await lockPage.expectReady();
  await lockPage.expectNoDirectoryTable();
}
