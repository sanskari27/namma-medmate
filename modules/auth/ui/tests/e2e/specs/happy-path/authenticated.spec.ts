import { reachAuthenticatedWidget } from '../../flows/reach-authenticated-widget.flow.ts';
import { reachLoginMethods } from '../../flows/reach-login-methods.flow.ts';
import { reachPinUnlock } from '../../flows/reach-pin-unlock.flow.ts';
import { test } from '../../fixtures/e2e-test.ts';

test('authenticated story announces the subject', async ({ authWidgetPage }) => {
  await reachAuthenticatedWidget({ authWidgetPage });
});

test('login shows password and WhatsApp OTP', async ({ loginPage }) => {
  await reachLoginMethods({ loginPage });
});

test('pin unlock is ready', async ({ pinUnlockPage }) => {
  await reachPinUnlock({ pinUnlockPage });
});
