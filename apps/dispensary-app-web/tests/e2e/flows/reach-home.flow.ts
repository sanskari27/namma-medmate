import { expectHomeSession, openHome } from '../screens/home/home.steps.ts';
import type { HomePage } from '../screens/home/home.page.ts';

export async function reachHome({ homePage }: { homePage: HomePage }): Promise<void> {
  await openHome({ homePage });
  await expectHomeSession({ homePage });
}
