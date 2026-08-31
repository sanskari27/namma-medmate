import { e2eTags, taggedTitle } from '@namma-medmate/e2e-kit';
import { hqTableStories, tableStories } from '../../data/stories.ts';
import { openTableStory } from '../../screens/audit-event-table/audit-event-table.steps.ts';
import { openHqTableStory } from '../../screens/hq-audit-event-table/hq-audit-event-table.steps.ts';
import { test } from '../../fixtures/e2e-test.ts';

for (const story of tableStories) {
  test(taggedTitle(`visual for table ${story}`, e2eTags.visual), async ({ tablePage, visual }) => {
    await openTableStory({ tablePage }, story);
    await visual.screenshot(`table-${story}.png`);
  });
}

for (const story of hqTableStories) {
  test(
    taggedTitle(`visual for hq table ${story}`, e2eTags.visual),
    async ({ hqTablePage, visual }) => {
      await openHqTableStory({ hqTablePage }, story);
      await visual.screenshot(`hq-table-${story}.png`);
    },
  );
}
