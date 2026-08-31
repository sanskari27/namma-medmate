import { e2eTags, taggedTitle } from '@namma-medmate/e2e-kit';
import { reachHome } from '../../flows/reach-home.flow.ts';
import { test } from '../../fixtures/e2e-test.ts';

test(taggedTitle('home page screenshot', e2eTags.visual), async ({ homePage, visual }) => {
  await reachHome({ homePage });
  await visual.screenshot('home.png');
});
