import { expectAddEnabled, openListStory } from '../screens/list/list.steps.ts';
import type { ManageUsersPage } from '../screens/list/list.page.ts';

export async function reachManageUsersList({
  listPage,
}: {
  listPage: ManageUsersPage;
}): Promise<void> {
  await openListStory({ listPage }, 'free-with-seat');
  await listPage.expectReady();
  await expectAddEnabled({ listPage });
}
