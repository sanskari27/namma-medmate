import type { PinUnlockPageScreen } from './pin-unlock-page.page.ts';

export async function openPinUnlockPage({
  pinUnlockPage,
}: {
  pinUnlockPage: PinUnlockPageScreen;
}): Promise<void> {
  await pinUnlockPage.goto();
}

export async function expectPinUnlockPage({
  pinUnlockPage,
}: {
  pinUnlockPage: PinUnlockPageScreen;
}): Promise<void> {
  await pinUnlockPage.expectReady();
}
