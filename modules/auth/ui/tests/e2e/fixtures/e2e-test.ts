import { createE2eTest } from '@namma-medmate/e2e-kit';
import { AuthWidgetPage } from '../screens/auth-widget/auth-widget.page.ts';

export const test = createE2eTest({
  authWidgetPage: AuthWidgetPage,
});

export { expect } from '@namma-medmate/e2e-kit';
