import {
  expectAuthenticatedWidget,
  openAuthWidgetStory,
} from '../screens/auth-widget/auth-widget.steps.ts';
import type { AuthWidgetPage } from '../screens/auth-widget/auth-widget.page.ts';

export async function reachAuthenticatedWidget({
  authWidgetPage,
}: {
  authWidgetPage: AuthWidgetPage;
}): Promise<void> {
  await openAuthWidgetStory({ authWidgetPage }, 'authenticated');
  await expectAuthenticatedWidget({ authWidgetPage });
}
