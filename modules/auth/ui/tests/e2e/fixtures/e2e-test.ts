import { createE2eTest } from '@namma-medmate/e2e-kit';
import { AuthWidgetPage } from '../screens/auth-widget/auth-widget.page.ts';
import { LoginPageScreen } from '../screens/login-page/login-page.page.ts';
import { PinUnlockPageScreen } from '../screens/pin-unlock-page/pin-unlock-page.page.ts';

export const test = createE2eTest({
  authWidgetPage: AuthWidgetPage,
  loginPage: LoginPageScreen,
  pinUnlockPage: PinUnlockPageScreen,
});

export { expect } from '@namma-medmate/e2e-kit';
