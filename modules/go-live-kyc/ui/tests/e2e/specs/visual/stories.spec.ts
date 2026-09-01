import { e2eTags, taggedTitle } from '@namma-medmate/e2e-kit';
import { queueStories, wizardStories } from '../../data/stories.ts';
import { openWizardStory } from '../../screens/wizard/wizard.steps.ts';
import { openQueueStory } from '../../screens/queue/queue.steps.ts';
import { test } from '../../fixtures/e2e-test.ts';

for (const story of wizardStories) {
  test(
    taggedTitle(`visual for go-live wizard ${story}`, e2eTags.visual),
    async ({ wizardPage, visual }) => {
      await openWizardStory({ wizardPage }, story);
      await wizardPage.expectReady();
      await visual.screenshot(`go-live-wizard-${story}.png`);
    },
  );
}

for (const story of queueStories) {
  test(
    taggedTitle(`visual for kyc queue ${story}`, e2eTags.visual),
    async ({ queuePage, visual }) => {
      await openQueueStory({ queuePage }, story);
      await queuePage.expectReady();
      await visual.screenshot(`kyc-queue-${story}.png`);
    },
  );
}
