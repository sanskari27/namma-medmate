import type { UserDrawerPage } from './drawer.page.ts';
import type { DrawerStory } from '../../data/stories.ts';

export async function openCashierDrawer({
  drawerPage,
}: {
  drawerPage: UserDrawerPage;
}): Promise<void> {
  await drawerPage.gotoStory('cashier-drawer');
}

export async function openOwnerDrawer({
  drawerPage,
}: {
  drawerPage: UserDrawerPage;
}): Promise<void> {
  await drawerPage.gotoStory('owner-drawer');
}

export async function openDrawerStory(
  { drawerPage }: { drawerPage: UserDrawerPage },
  story: DrawerStory,
): Promise<void> {
  await drawerPage.gotoStory(story);
}
