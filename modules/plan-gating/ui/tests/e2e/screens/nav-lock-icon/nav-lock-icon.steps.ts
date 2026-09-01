import type { NavLockIconPage } from './nav-lock-icon.page.ts';

export async function openLockedNavIcon({
  navLockPage,
}: {
  navLockPage: NavLockIconPage;
}): Promise<void> {
  await navLockPage.gotoLocked();
}

export async function expectLockedNavIcon({
  navLockPage,
}: {
  navLockPage: NavLockIconPage;
}): Promise<void> {
  await navLockPage.expectReady();
}

export async function expectUnlockedNavIcon({
  navLockPage,
}: {
  navLockPage: NavLockIconPage;
}): Promise<void> {
  await navLockPage.gotoUnlocked();
  await navLockPage.expectHidden();
}
