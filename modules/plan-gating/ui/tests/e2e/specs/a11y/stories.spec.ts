import { e2eTags, taggedTitle } from '@namma-medmate/e2e-kit';
import { planGateStories, paywallStories } from '../../data/stories.ts';
import { openPaywallStory, openPlanGateStory } from '../../screens/paywall/paywall.steps.ts';
import { openLockedNavIcon } from '../../screens/nav-lock-icon/nav-lock-icon.steps.ts';
import { test } from '../../fixtures/e2e-test.ts';

for (const story of planGateStories) {
  test(taggedTitle(`a11y for plan gate ${story}`, e2eTags.a11y), async ({ paywallPage, a11y }) => {
    await openPlanGateStory({ paywallPage }, story);
    await a11y.scan();
  });
}

for (const story of paywallStories) {
  test(taggedTitle(`a11y for paywall ${story}`, e2eTags.a11y), async ({ paywallPage, a11y }) => {
    await openPaywallStory({ paywallPage }, story);
    await paywallPage.expectReady();
    await a11y.scan();
  });
}

test(taggedTitle('a11y for locked nav icon', e2eTags.a11y), async ({ navLockPage, a11y }) => {
  await openLockedNavIcon({ navLockPage });
  await navLockPage.expectReady();
  await a11y.scan();
});
