import {
  expectPinUnlockPage,
  openPinUnlockPage,
} from '../screens/pin-unlock-page/pin-unlock-page.steps.ts';
import type { PinUnlockPageScreen } from '../screens/pin-unlock-page/pin-unlock-page.page.ts';

export async function reachPinUnlock({
  pinUnlockPage,
}: {
  pinUnlockPage: PinUnlockPageScreen;
}): Promise<void> {
  await openPinUnlockPage({ pinUnlockPage });
  await expectPinUnlockPage({ pinUnlockPage });
}
