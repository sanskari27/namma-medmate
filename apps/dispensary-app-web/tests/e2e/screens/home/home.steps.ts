import type { HomePage } from './home.page.ts';

export async function openHome({ homePage }: { homePage: HomePage }): Promise<void> {
  await homePage.goto();
}

export async function expectHomeSession({ homePage }: { homePage: HomePage }): Promise<void> {
  await homePage.expectReady();
}

export async function expectHomeUnauthenticatedWidget({
  homePage,
}: {
  homePage: HomePage;
}): Promise<void> {
  await homePage.expectWidgetHeading();
}
