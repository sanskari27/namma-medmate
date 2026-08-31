import { e2eTags, taggedTitle } from '@namma-medmate/e2e-kit';
import { reachAuthenticatedWidget } from '../../flows/reach-authenticated-widget.flow.ts';
import { test } from '../../fixtures/e2e-test.ts';

test(
  taggedTitle('authenticated widget is reachable', e2eTags.smoke),
  async ({ authWidgetPage }) => {
    await reachAuthenticatedWidget({ authWidgetPage });
  },
);
