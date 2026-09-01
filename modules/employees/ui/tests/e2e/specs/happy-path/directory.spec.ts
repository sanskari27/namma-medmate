import { expectAddEnabled, openListStory } from '../../screens/list/list.steps.ts';
import { openEmployeeDrawer } from '../../screens/drawer/drawer.steps.ts';
import { test } from '../../fixtures/e2e-test.ts';

test('Add employee is enabled on the directory', async ({ listPage }) => {
  await openListStory({ listPage }, 'directory');
  await expectAddEnabled({ listPage });
});

test('Employee drawer exposes Generate ID card', async ({ drawerPage }) => {
  await openEmployeeDrawer({ drawerPage });
  await drawerPage.expectReady();
  await drawerPage.expectIdCardEnabled();
});
