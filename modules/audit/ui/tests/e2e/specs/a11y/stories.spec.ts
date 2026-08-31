import { e2eTags, taggedTitle } from '@namma-medmate/e2e-kit';
import { hqTableStories, tableStories } from '../../data/stories.ts';
import { openTableStory } from '../../screens/audit-event-table/audit-event-table.steps.ts';
import { openHqTableStory } from '../../screens/hq-audit-event-table/hq-audit-event-table.steps.ts';
import { test } from '../../fixtures/e2e-test.ts';

for (const story of tableStories) {
  test(taggedTitle(`a11y for table ${story}`, e2eTags.a11y), async ({ tablePage, a11y }) => {
    await openTableStory({ tablePage }, story);
    await a11y.scan();
  });
}

for (const story of hqTableStories) {
  test(taggedTitle(`a11y for hq table ${story}`, e2eTags.a11y), async ({ hqTablePage, a11y }) => {
    await openHqTableStory({ hqTablePage }, story);
    await a11y.scan();
  });
}
