import { e2eTags, taggedTitle } from '@namma-medmate/e2e-kit';
import { listStories } from '../../data/stories.ts';
import { openListStory } from '../../screens/list/list.steps.ts';
import { test } from '../../fixtures/e2e-test.ts';

for (const story of listStories) {
  test(
    taggedTitle(`visual for manage users ${story}`, e2eTags.visual),
    async ({ listPage, visual }) => {
      await openListStory({ listPage }, story);
      await listPage.expectReady();
      await visual.screenshot(`manage-users-${story}.png`);
    },
  );
}
