import type { AuthWidgetPage } from './auth-widget.page.ts';
import type { AuthWidgetStory } from '../../data/stories.ts';

export async function openAuthWidgetStory(
  { authWidgetPage }: { authWidgetPage: AuthWidgetPage },
  story: AuthWidgetStory,
): Promise<void> {
  await authWidgetPage.gotoStory(story);
}

export async function expectAuthenticatedWidget({
  authWidgetPage,
}: {
  authWidgetPage: AuthWidgetPage;
}): Promise<void> {
  await authWidgetPage.expectReady();
}

export async function expectAuthWidgetFailure({
  authWidgetPage,
}: {
  authWidgetPage: AuthWidgetPage;
}): Promise<void> {
  await authWidgetPage.expectAlertVisible();
}
