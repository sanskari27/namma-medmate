import { e2eTags, taggedTitle } from '@namma-medmate/e2e-kit';
import { drawerStories, pageStories } from '../../data/stories.ts';
import { openListStory } from '../../screens/list/list.steps.ts';
import { openEmployeeDrawer } from '../../screens/drawer/drawer.steps.ts';
import { openPlanLock } from '../../screens/lock/lock.steps.ts';
import { test } from '../../fixtures/e2e-test.ts';

for (const story of pageStories) {
  test(taggedTitle(`a11y for employees ${story}`, e2eTags.a11y), async ({ listPage, a11y }) => {
    await openListStory({ listPage }, story);
    await listPage.expectReady();
    await a11y.scan();
  });
}

test(taggedTitle('a11y for employees plan lock', e2eTags.a11y), async ({ lockPage, a11y }) => {
  await openPlanLock({ lockPage });
  await lockPage.expectReady();
  await a11y.scan();
});

for (const story of drawerStories) {
  test(taggedTitle(`a11y for employees ${story}`, e2eTags.a11y), async ({ drawerPage, a11y }) => {
    await openEmployeeDrawer({ drawerPage });
    await drawerPage.expectReady();
    await a11y.scan();
  });
}
