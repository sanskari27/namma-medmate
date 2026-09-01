import type { AddMedicineModalPage } from './add-modal.page.ts';
import type { AddModalStory } from '../../data/stories.ts';

export async function openAddModalStory(
  { addModalPage }: { addModalPage: AddMedicineModalPage },
  story: AddModalStory,
): Promise<void> {
  await addModalPage.gotoStory(story);
}

export async function expectOpenAddModal({
  addModalPage,
}: {
  addModalPage: AddMedicineModalPage;
}): Promise<void> {
  await addModalPage.expectReady();
}
