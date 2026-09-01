import { e2eTags, taggedTitle } from '@namma-medmate/e2e-kit';
import { drawerStories, pageStories } from '../../data/stories.ts';
import { openListStory } from '../../screens/list/list.steps.ts';
import { openEmployeeDrawer } from '../../screens/drawer/drawer.steps.ts';
import { openPlanLock } from '../../screens/lock/lock.steps.ts';
import { test } from '../../fixtures/e2e-test.ts';

for (const story of pageStories) {
  test(
    taggedTitle(`visual for employees ${story}`, e2eTags.visual),
    async ({ listPage, visual }) => {
      await openListStory({ listPage }, story);
      await listPage.expectReady();
      await visual.screenshot(`employees-${story}.png`);
    },
  );
}

test(
  taggedTitle('visual for employees plan lock', e2eTags.visual),
  async ({ lockPage, visual }) => {
    await openPlanLock({ lockPage });
    await lockPage.expectReady();
    await visual.screenshot('employees-plan-locked.png');
  },
);

for (const story of drawerStories) {
  test(
    taggedTitle(`visual for employees ${story}`, e2eTags.visual),
    async ({ drawerPage, visual }) => {
      await openEmployeeDrawer({ drawerPage });
      await drawerPage.expectReady();
      await visual.screenshot(`employees-${story}.png`);
    },
  );
}
