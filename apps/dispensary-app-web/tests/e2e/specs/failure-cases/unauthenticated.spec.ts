import { expectHomeUnauthenticatedWidget, openHome } from '../../screens/home/index.ts';
import { test } from '../../fixtures/e2e-test.ts';

test('home page remains reachable without a token', async ({ homePage }) => {
  await openHome({ homePage });
  await expectHomeUnauthenticatedWidget({ homePage });
});
