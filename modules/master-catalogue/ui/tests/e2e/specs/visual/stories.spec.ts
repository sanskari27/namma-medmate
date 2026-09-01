import { e2eTags, taggedTitle } from '@namma-medmate/e2e-kit';
import { addModalStories, drawerStories, listStories } from '../../data/stories.ts';
import { openListStory } from '../../screens/list/list.steps.ts';
import { openDrawerStory } from '../../screens/drawer/drawer.steps.ts';
import { openAddModalStory } from '../../screens/add-modal/add-modal.steps.ts';
import { test } from '../../fixtures/e2e-test.ts';

for (const story of listStories) {
  test(taggedTitle(`visual for list ${story}`, e2eTags.visual), async ({ listPage, visual }) => {
    await openListStory({ listPage }, story);
    await visual.screenshot(`list-${story}.png`);
  });
}

for (const story of drawerStories) {
  test(
    taggedTitle(`visual for drawer ${story}`, e2eTags.visual),
    async ({ drawerPage, visual }) => {
      await openDrawerStory({ drawerPage }, story);
      await visual.screenshot(`drawer-${story}.png`);
    },
  );
}

for (const story of addModalStories) {
  test(
    taggedTitle(`visual for add modal ${story}`, e2eTags.visual),
    async ({ addModalPage, visual }) => {
      await openAddModalStory({ addModalPage }, story);
      await visual.screenshot(`add-modal-${story}.png`);
    },
  );
}
