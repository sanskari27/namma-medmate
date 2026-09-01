import { expectWizardError, openWizardStory } from '../../screens/wizard/wizard.steps.ts';
import {
  expectEmptyQueue,
  expectQueueError,
  openQueueStory,
} from '../../screens/queue/queue.steps.ts';
import { test } from '../../fixtures/e2e-test.ts';

test('Wizard load error shows an alert', async ({ wizardPage }) => {
  await openWizardStory({ wizardPage }, 'load-error');
  await expectWizardError({ wizardPage });
});

test('Empty HQ queue shows the empty copy', async ({ queuePage }) => {
  await openQueueStory({ queuePage }, 'empty');
  await expectEmptyQueue({ queuePage });
});

test('Queue load error shows an alert', async ({ queuePage }) => {
  await openQueueStory({ queuePage }, 'load-error');
  await expectQueueError({ queuePage });
});
