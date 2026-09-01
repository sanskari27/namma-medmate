import { e2eTags, taggedTitle } from '@namma-medmate/e2e-kit';
import { addModalStories, drawerStories, listStories } from '../../data/stories.ts';
import { openListStory } from '../../screens/list/list.steps.ts';
import { openDrawerStory } from '../../screens/drawer/drawer.steps.ts';
import { openAddModalStory } from '../../screens/add-modal/add-modal.steps.ts';
import { test } from '../../fixtures/e2e-test.ts';

for (const story of listStories) {
  test(taggedTitle(`a11y for list ${story}`, e2eTags.a11y), async ({ listPage, a11y }) => {
    await openListStory({ listPage }, story);
    await a11y.scan();
  });
}

for (const story of drawerStories) {
  test(taggedTitle(`a11y for drawer ${story}`, e2eTags.a11y), async ({ drawerPage, a11y }) => {
    await openDrawerStory({ drawerPage }, story);
    await a11y.scan();
  });
}

for (const story of addModalStories) {
  test(taggedTitle(`a11y for add modal ${story}`, e2eTags.a11y), async ({ addModalPage, a11y }) => {
    await openAddModalStory({ addModalPage }, story);
    await a11y.scan();
  });
}
