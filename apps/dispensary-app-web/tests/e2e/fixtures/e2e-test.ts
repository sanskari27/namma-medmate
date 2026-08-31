import { createE2eTest } from '@namma-medmate/e2e-kit';
import { HomePage } from '../screens/home/home.page.ts';

export const test = createE2eTest({
  homePage: HomePage,
});

export { expect } from '@namma-medmate/e2e-kit';
