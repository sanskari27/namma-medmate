import { e2eTags, taggedTitle } from '@namma-medmate/e2e-kit';
import { authWidgetStories } from '../../data/stories.ts';
import { openAuthWidgetStory } from '../../screens/auth-widget/auth-widget.steps.ts';
import { test } from '../../fixtures/e2e-test.ts';

for (const story of authWidgetStories) {
  test(
    taggedTitle(`visual for ${story} story`, e2eTags.visual),
    async ({ authWidgetPage, visual }) => {
      await openAuthWidgetStory({ authWidgetPage }, story);
      await authWidgetPage.expectReady();
      await visual.screenshot(`${story}.png`);
    },
  );
}
