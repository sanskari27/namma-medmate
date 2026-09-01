import type { LoginPageScreen } from './login-page.page.ts';
import type { LoginPageStory } from '../../data/stories.ts';

export async function openLoginPageStory(
  { loginPage }: { loginPage: LoginPageScreen },
  story: LoginPageStory,
): Promise<void> {
  await loginPage.gotoStory(story);
}

export async function expectLoginMethods({
  loginPage,
}: {
  loginPage: LoginPageScreen;
}): Promise<void> {
  await loginPage.expectReady();
  await loginPage.expectMethodsVisible();
}

export async function expectLoginAlert({
  loginPage,
}: {
  loginPage: LoginPageScreen;
}): Promise<void> {
  await loginPage.expectAlertVisible();
}
