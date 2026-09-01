import { reachHome } from '../../flows/reach-home.flow.ts';
import { test } from '../../fixtures/e2e-test.ts';

test('home page exposes the session heading', async ({ homePage }) => {
  await reachHome({ homePage });
});
