import type { MasterCatalogueDrawerPage } from './drawer.page.ts';
import type { DrawerStory } from '../../data/stories.ts';

export async function openDrawerStory(
  { drawerPage }: { drawerPage: MasterCatalogueDrawerPage },
  story: DrawerStory,
): Promise<void> {
  await drawerPage.gotoStory(story);
}

export async function expectLoadedDrawer({
  drawerPage,
}: {
  drawerPage: MasterCatalogueDrawerPage;
}): Promise<void> {
  await drawerPage.expectReady();
}

export async function expectEmptyStockingDrawer({
  drawerPage,
}: {
  drawerPage: MasterCatalogueDrawerPage;
}): Promise<void> {
  await drawerPage.expectEmptyStocking();
}

export async function openBanConfirm({
  drawerPage,
}: {
  drawerPage: MasterCatalogueDrawerPage;
}): Promise<void> {
  await drawerPage.locators.ban.click();
  await drawerPage.expectBanConfirm();
}
