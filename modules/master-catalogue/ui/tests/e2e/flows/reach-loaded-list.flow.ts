import { expectLoadedList } from '../screens/list/list.steps.ts';
import type { MasterCatalogueListPage } from '../screens/list/list.page.ts';

export async function reachLoadedList({ listPage }: { listPage: MasterCatalogueListPage }) {
  await listPage.gotoStory('loaded');
  await expectLoadedList({ listPage });
}
