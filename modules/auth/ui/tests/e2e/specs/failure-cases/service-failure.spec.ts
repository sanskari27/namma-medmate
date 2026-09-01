import { reachAuthWidgetFailure } from '../../flows/reach-auth-widget-failure.flow.ts';
import { reachLoginFailure } from '../../flows/reach-login-failure.flow.ts';
import { test } from '../../fixtures/e2e-test.ts';

test('failure story exposes an alert', async ({ authWidgetPage }) => {
  await reachAuthWidgetFailure({ authWidgetPage });
});

test('undeliverable OTP shows fallback copy', async ({ loginPage }) => {
  await reachLoginFailure({ loginPage });
});
