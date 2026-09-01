import { e2eTags, taggedTitle } from '@namma-medmate/e2e-kit';
import { drawerStories, pageStories } from '../../data/stories.ts';
import { openListStory } from '../../screens/list/list.steps.ts';
import { openDrawerStory } from '../../screens/drawer/drawer.steps.ts';
import { test } from '../../fixtures/e2e-test.ts';

for (const story of pageStories) {
  test(
    taggedTitle(`visual for manage users ${story}`, e2eTags.visual),
    async ({ listPage, visual }) => {
      await openListStory({ listPage }, story);
      await listPage.expectReady();
      await visual.screenshot(`manage-users-${story}.png`);
    },
  );
}

for (const story of drawerStories) {
  test(
    taggedTitle(`visual for manage users ${story}`, e2eTags.visual),
    async ({ drawerPage, visual }) => {
      await openDrawerStory({ drawerPage }, story);
      await drawerPage.expectReady();
      await visual.screenshot(`manage-users-${story}.png`);
    },
  );
}
