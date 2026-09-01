import { expectAddEnabled, openListStory } from '../screens/list/list.steps.ts';
import type { EmployeesListPage } from '../screens/list/list.page.ts';

export async function reachEmployeesDirectory({
  listPage,
}: {
  listPage: EmployeesListPage;
}): Promise<void> {
  await openListStory({ listPage }, 'directory');
  await listPage.expectReady();
  await expectAddEnabled({ listPage });
}
