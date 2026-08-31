import { expectHomeSession, openHome } from '../../screens/home/index.ts';
import { test } from '../../fixtures/e2e-test.ts';

test('home page exposes the session heading', async ({ homePage }) => {
  await openHome({ homePage });
  await expectHomeSession({ homePage });
});
