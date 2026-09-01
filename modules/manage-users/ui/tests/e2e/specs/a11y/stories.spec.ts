import { e2eTags, taggedTitle } from '@namma-medmate/e2e-kit';
import { drawerStories, pageStories } from '../../data/stories.ts';
import { openListStory } from '../../screens/list/list.steps.ts';
import { openDrawerStory } from '../../screens/drawer/drawer.steps.ts';
import { test } from '../../fixtures/e2e-test.ts';

for (const story of pageStories) {
  test(taggedTitle(`a11y for manage users ${story}`, e2eTags.a11y), async ({ listPage, a11y }) => {
    await openListStory({ listPage }, story);
    await listPage.expectReady();
    await a11y.scan();
  });
}

for (const story of drawerStories) {
  test(
    taggedTitle(`a11y for manage users ${story}`, e2eTags.a11y),
    async ({ drawerPage, a11y }) => {
      await openDrawerStory({ drawerPage }, story);
      await drawerPage.expectReady();
      await a11y.scan();
    },
  );
}
