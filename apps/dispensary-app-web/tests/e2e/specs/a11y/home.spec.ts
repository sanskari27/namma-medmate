import { e2eTags, taggedTitle } from '@namma-medmate/e2e-kit';
import { reachHome } from '../../flows/reach-home.flow.ts';
import { test } from '../../fixtures/e2e-test.ts';

test(taggedTitle('home page has no axe violations', e2eTags.a11y), async ({ homePage, a11y }) => {
  await reachHome({ homePage });
  await a11y.scan();
});
