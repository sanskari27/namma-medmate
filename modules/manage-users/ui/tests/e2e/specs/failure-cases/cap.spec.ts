import { expectAddDisabledAtCap, openListStory } from '../../screens/list/list.steps.ts';
import { openOwnerDrawer } from '../../screens/drawer/drawer.steps.ts';
import { test } from '../../fixtures/e2e-test.ts';

test('Add user is disabled at the Free cap and names Growth and Pro', async ({ listPage }) => {
  await openListStory({ listPage }, 'at-cap');
  await expectAddDisabledAtCap({ listPage });
});

test('Owner drawer cannot reduce permissions or remove the Owner', async ({ drawerPage }) => {
  await openOwnerDrawer({ drawerPage });
  await drawerPage.expectOwnerLocked();
});
