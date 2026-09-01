import { expectAddEnabled, openListStory } from '../../screens/list/list.steps.ts';
import { openCashierDrawer } from '../../screens/drawer/drawer.steps.ts';
import { test } from '../../fixtures/e2e-test.ts';

test('Add user is enabled within the Free seat cap', async ({ listPage }) => {
  await openListStory({ listPage }, 'free-with-seat');
  await expectAddEnabled({ listPage });
});

test('Cashier drawer exposes copy password', async ({ drawerPage }) => {
  await openCashierDrawer({ drawerPage });
  await drawerPage.expectReady();
  await drawerPage.expectCopyEnabled();
});
