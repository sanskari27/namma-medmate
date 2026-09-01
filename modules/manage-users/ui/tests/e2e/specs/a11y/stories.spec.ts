import { e2eTags, taggedTitle } from '@namma-medmate/e2e-kit';
import { listStories } from '../../data/stories.ts';
import { openListStory } from '../../screens/list/list.steps.ts';
import { test } from '../../fixtures/e2e-test.ts';

for (const story of listStories) {
  test(taggedTitle(`a11y for manage users ${story}`, e2eTags.a11y), async ({ listPage, a11y }) => {
    await openListStory({ listPage }, story);
    await listPage.expectReady();
    await a11y.scan();
  });
}
