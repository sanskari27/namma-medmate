import { reachAuthenticatedWidget } from '../../flows/reach-authenticated-widget.flow.ts';
import { test } from '../../fixtures/e2e-test.ts';

test('authenticated story announces the subject', async ({ authWidgetPage }) => {
  await reachAuthenticatedWidget({ authWidgetPage });
});
