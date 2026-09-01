import { e2eTags, taggedTitle } from '@namma-medmate/e2e-kit';
import { authWidgetStories, loginPageStories } from '../../data/stories.ts';
import { openAuthWidgetStory } from '../../screens/auth-widget/auth-widget.steps.ts';
import { openLoginPageStory } from '../../screens/login-page/login-page.steps.ts';
import { openPinUnlockPage } from '../../screens/pin-unlock-page/pin-unlock-page.steps.ts';
import { test } from '../../fixtures/e2e-test.ts';

for (const story of authWidgetStories) {
  test(
    taggedTitle(`visual for ${story} story`, e2eTags.visual),
    async ({ authWidgetPage, visual }) => {
      await openAuthWidgetStory({ authWidgetPage }, story);
      await authWidgetPage.expectReady();
      await visual.screenshot(`${story}.png`);
    },
  );
}

for (const story of loginPageStories) {
  test(taggedTitle(`visual for login ${story}`, e2eTags.visual), async ({ loginPage, visual }) => {
    await openLoginPageStory({ loginPage }, story);
    await loginPage.expectReady();
    await visual.screenshot(`login-${story}.png`);
  });
}

test(taggedTitle('visual for pin unlock', e2eTags.visual), async ({ pinUnlockPage, visual }) => {
  await openPinUnlockPage({ pinUnlockPage });
  await pinUnlockPage.expectReady();
  await visual.screenshot('pin-unlock.png');
});
