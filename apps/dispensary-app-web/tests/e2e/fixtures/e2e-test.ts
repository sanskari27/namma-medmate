import { createE2eTest } from '@namma-medmate/e2e-kit';
import { HomePage } from '../screens/home/home.page.ts';
import { LoginPage } from '../screens/login/login.page.ts';

export const test = createE2eTest({
  homePage: HomePage,
  loginPage: LoginPage,
});

export { expect } from '@namma-medmate/e2e-kit';
