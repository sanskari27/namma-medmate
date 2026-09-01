import { e2eTags, taggedTitle } from '@namma-medmate/e2e-kit';
import { planGateStories, paywallStories } from '../../data/stories.ts';
import { openPaywallStory, openPlanGateStory } from '../../screens/paywall/paywall.steps.ts';
import { openLockedNavIcon } from '../../screens/nav-lock-icon/nav-lock-icon.steps.ts';
import { test } from '../../fixtures/e2e-test.ts';

for (const story of planGateStories) {
  test(
    taggedTitle(`visual for plan gate ${story}`, e2eTags.visual),
    async ({ paywallPage, planGatePage, visual }) => {
      await openPlanGateStory({ paywallPage }, story);
      await planGatePage.expectReady();
      await visual.screenshot(`plan-gate-${story}.png`);
    },
  );
}

for (const story of paywallStories) {
  test(
    taggedTitle(`visual for paywall ${story}`, e2eTags.visual),
    async ({ paywallPage, visual }) => {
      await openPaywallStory({ paywallPage }, story);
      await paywallPage.expectReady();
      await visual.screenshot(`paywall-${story}.png`);
    },
  );
}

test(taggedTitle('visual for locked nav icon', e2eTags.visual), async ({ navLockPage, visual }) => {
  await openLockedNavIcon({ navLockPage });
  await navLockPage.expectReady();
  await visual.screenshot('nav-lock-locked.png');
});
