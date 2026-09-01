import { expectEmptyList, expectErrorList, openListStory } from '../../screens/list/list.steps.ts';
import { expectEmptyStockingDrawer, openDrawerStory } from '../../screens/drawer/drawer.steps.ts';
import { test } from '../../fixtures/e2e-test.ts';

test('empty list shows the empty copy', async ({ listPage }) => {
  await openListStory({ listPage }, 'empty');
  await expectEmptyList({ listPage });
});

test('error list shows the alert', async ({ listPage }) => {
  await openListStory({ listPage }, 'load-error');
  await expectErrorList({ listPage });
});

test('drawer with no mappings shows empty stocking copy', async ({ drawerPage }) => {
  await openDrawerStory({ drawerPage }, 'empty-stocking');
  await expectEmptyStockingDrawer({ drawerPage });
});
