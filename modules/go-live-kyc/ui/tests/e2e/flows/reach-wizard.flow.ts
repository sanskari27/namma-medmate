import { expectRerunAvailable, openWizardStory } from '../screens/wizard/wizard.steps.ts';
import type { GoLiveWizardScreen } from '../screens/wizard/wizard.page.ts';

export async function reachGoLiveWizard({
  wizardPage,
}: {
  wizardPage: GoLiveWizardScreen;
}): Promise<void> {
  await openWizardStory({ wizardPage }, 'start');
  await wizardPage.expectReady();
}

export async function reachCompletedWizard({
  wizardPage,
}: {
  wizardPage: GoLiveWizardScreen;
}): Promise<void> {
  await openWizardStory({ wizardPage }, 'complete');
  await wizardPage.expectReady();
  await expectRerunAvailable({ wizardPage });
}
