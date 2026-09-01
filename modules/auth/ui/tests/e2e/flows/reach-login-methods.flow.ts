import { expectLoginMethods, openLoginPageStory } from '../screens/login-page/login-page.steps.ts';
import type { LoginPageScreen } from '../screens/login-page/login-page.page.ts';

export async function reachLoginMethods({
  loginPage,
}: {
  loginPage: LoginPageScreen;
}): Promise<void> {
  await openLoginPageStory({ loginPage }, 'both-methods');
  await expectLoginMethods({ loginPage });
}
