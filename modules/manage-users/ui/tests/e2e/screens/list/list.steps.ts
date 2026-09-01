import type { ManageUsersPage } from './list.page.ts';
import type { ListStory } from '../../data/stories.ts';

export async function openListStory(
  { listPage }: { listPage: ManageUsersPage },
  story: ListStory,
): Promise<void> {
  await listPage.gotoStory(story);
}

export async function expectAddEnabled({ listPage }: { listPage: ManageUsersPage }): Promise<void> {
  await listPage.expectAddEnabled();
}

export async function expectAddDisabledAtCap({
  listPage,
}: {
  listPage: ManageUsersPage;
}): Promise<void> {
  await listPage.expectAddDisabled();
}
