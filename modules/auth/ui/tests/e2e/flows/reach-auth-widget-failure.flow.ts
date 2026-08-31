import {
  expectAuthWidgetFailure,
  openAuthWidgetStory,
} from '../screens/auth-widget/auth-widget.steps.ts';
import type { AuthWidgetPage } from '../screens/auth-widget/auth-widget.page.ts';

export async function reachAuthWidgetFailure({
  authWidgetPage,
}: {
  authWidgetPage: AuthWidgetPage;
}): Promise<void> {
  await openAuthWidgetStory({ authWidgetPage }, 'failure');
  await expectAuthWidgetFailure({ authWidgetPage });
}
