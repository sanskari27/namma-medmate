import { e2eTags, taggedTitle } from '@namma-medmate/e2e-kit';
import { queueStories, wizardStories } from '../../data/stories.ts';
import { openWizardStory } from '../../screens/wizard/wizard.steps.ts';
import { openQueueStory } from '../../screens/queue/queue.steps.ts';
import { test } from '../../fixtures/e2e-test.ts';

for (const story of wizardStories) {
  test(
    taggedTitle(`a11y for go-live wizard ${story}`, e2eTags.a11y),
    async ({ wizardPage, a11y }) => {
      await openWizardStory({ wizardPage }, story);
      await wizardPage.expectReady();
      await a11y.scan();
    },
  );
}

for (const story of queueStories) {
  test(taggedTitle(`a11y for kyc queue ${story}`, e2eTags.a11y), async ({ queuePage, a11y }) => {
    await openQueueStory({ queuePage }, story);
    await queuePage.expectReady();
    await a11y.scan();
  });
}
