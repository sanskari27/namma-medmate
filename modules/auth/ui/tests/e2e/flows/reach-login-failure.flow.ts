import { expectLoginAlert, openLoginPageStory } from '../screens/login-page/login-page.steps.ts';
import type { LoginPageScreen } from '../screens/login-page/login-page.page.ts';

export async function reachLoginFailure({
  loginPage,
}: {
  loginPage: LoginPageScreen;
}): Promise<void> {
  await openLoginPageStory({ loginPage }, 'undeliverable');
  await expectLoginAlert({ loginPage });
}
