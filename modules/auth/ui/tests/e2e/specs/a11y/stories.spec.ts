import { e2eTags, taggedTitle } from '@namma-medmate/e2e-kit';
import { authWidgetStories, loginPageStories } from '../../data/stories.ts';
import { openAuthWidgetStory } from '../../screens/auth-widget/auth-widget.steps.ts';
import { openLoginPageStory } from '../../screens/login-page/login-page.steps.ts';
import { openPinUnlockPage } from '../../screens/pin-unlock-page/pin-unlock-page.steps.ts';
import { test } from '../../fixtures/e2e-test.ts';

for (const story of authWidgetStories) {
  test(taggedTitle(`a11y for ${story} story`, e2eTags.a11y), async ({ authWidgetPage, a11y }) => {
    await openAuthWidgetStory({ authWidgetPage }, story);
    await authWidgetPage.expectReady();
    await a11y.scan();
  });
}

for (const story of loginPageStories) {
  test(taggedTitle(`a11y for login ${story}`, e2eTags.a11y), async ({ loginPage, a11y }) => {
    await openLoginPageStory({ loginPage }, story);
    await loginPage.expectReady();
    await a11y.scan();
  });
}

test(taggedTitle('a11y for pin unlock', e2eTags.a11y), async ({ pinUnlockPage, a11y }) => {
  await openPinUnlockPage({ pinUnlockPage });
  await pinUnlockPage.expectReady();
  await a11y.scan();
});
