import type { GoLiveWizardScreen } from './wizard.page.ts';
import type { WizardStory } from '../../data/stories.ts';

export async function openWizardStory(
  { wizardPage }: { wizardPage: GoLiveWizardScreen },
  story: WizardStory,
): Promise<void> {
  await wizardPage.gotoStory(story);
}

export async function expectRejectedBanner({
  wizardPage,
}: {
  wizardPage: GoLiveWizardScreen;
}): Promise<void> {
  await wizardPage.expectRejected();
}

export async function expectWizardError({
  wizardPage,
}: {
  wizardPage: GoLiveWizardScreen;
}): Promise<void> {
  await wizardPage.expectError();
}

export async function expectRerunAvailable({
  wizardPage,
}: {
  wizardPage: GoLiveWizardScreen;
}): Promise<void> {
  await wizardPage.expectRerun();
}
