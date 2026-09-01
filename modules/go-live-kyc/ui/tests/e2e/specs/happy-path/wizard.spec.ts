import { expectRejectedBanner, openWizardStory } from '../../screens/wizard/wizard.steps.ts';
import { expectApproveEnabled, openQueueStory } from '../../screens/queue/queue.steps.ts';
import { reachCompletedWizard } from '../../flows/reach-wizard.flow.ts';
import { test } from '../../fixtures/e2e-test.ts';

test('Rejected KYC shows the HQ reason', async ({ wizardPage }) => {
  await openWizardStory({ wizardPage }, 'rejected');
  await expectRejectedBanner({ wizardPage });
});

test('Completed wizard offers a re-run', async ({ wizardPage }) => {
  await reachCompletedWizard({ wizardPage });
});

test('HQ queue can approve a pending shop', async ({ queuePage }) => {
  await openQueueStory({ queuePage }, 'pending');
  await expectApproveEnabled({ queuePage });
});
