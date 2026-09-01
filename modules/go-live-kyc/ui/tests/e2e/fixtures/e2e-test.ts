import { createE2eTest } from '@namma-medmate/e2e-kit';
import { GoLiveWizardScreen } from '../screens/wizard/wizard.page.ts';
import { HqKycQueueScreen } from '../screens/queue/queue.page.ts';

export const test = createE2eTest({
  wizardPage: GoLiveWizardScreen,
  queuePage: HqKycQueueScreen,
});

export { expect } from '@namma-medmate/e2e-kit';
