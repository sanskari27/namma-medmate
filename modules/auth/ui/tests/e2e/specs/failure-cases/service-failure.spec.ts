import { reachAuthWidgetFailure } from '../../flows/reach-auth-widget-failure.flow.ts';
import { test } from '../../fixtures/e2e-test.ts';

test('failure story exposes an alert', async ({ authWidgetPage }) => {
  await reachAuthWidgetFailure({ authWidgetPage });
});
