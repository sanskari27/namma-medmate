import type { LoginPage } from './login.page.ts';

export async function openLogin({ loginPage }: { loginPage: LoginPage }): Promise<void> {
  await loginPage.goto();
}

export async function expectLoginReady({ loginPage }: { loginPage: LoginPage }): Promise<void> {
  await loginPage.expectReady();
}
