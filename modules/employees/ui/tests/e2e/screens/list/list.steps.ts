import type { EmployeesListPage } from './list.page.ts';
import type { PageStory } from '../../data/stories.ts';

export async function openListStory(
  { listPage }: { listPage: EmployeesListPage },
  story: PageStory,
): Promise<void> {
  await listPage.gotoStory(story);
}

export async function expectAddEnabled({
  listPage,
}: {
  listPage: EmployeesListPage;
}): Promise<void> {
  await listPage.expectAddEnabled();
}

export async function expectEmptyDirectory({
  listPage,
}: {
  listPage: EmployeesListPage;
}): Promise<void> {
  await listPage.expectEmpty();
}

export async function expectLoadError({
  listPage,
}: {
  listPage: EmployeesListPage;
}): Promise<void> {
  await listPage.expectError();
}
