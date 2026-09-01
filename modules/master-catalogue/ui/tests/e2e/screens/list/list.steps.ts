import type { MasterCatalogueListPage } from './list.page.ts';
import type { ListStory } from '../../data/stories.ts';

export async function openListStory(
  { listPage }: { listPage: MasterCatalogueListPage },
  story: ListStory,
): Promise<void> {
  await listPage.gotoStory(story);
}

export async function expectLoadedList({
  listPage,
}: {
  listPage: MasterCatalogueListPage;
}): Promise<void> {
  await listPage.expectReady();
}

export async function expectEmptyList({
  listPage,
}: {
  listPage: MasterCatalogueListPage;
}): Promise<void> {
  await listPage.expectEmpty();
}

export async function expectErrorList({
  listPage,
}: {
  listPage: MasterCatalogueListPage;
}): Promise<void> {
  await listPage.expectError();
}

export async function openAddMedicine({
  listPage,
}: {
  listPage: MasterCatalogueListPage;
}): Promise<void> {
  await listPage.locators.add.click();
  await listPage.expectAddOpen();
}
