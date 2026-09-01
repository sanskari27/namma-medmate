import { openBanConfirm, openDrawerStory } from '../../screens/drawer/drawer.steps.ts';
import { expectOpenAddModal, openAddModalStory } from '../../screens/add-modal/add-modal.steps.ts';
import { openAddMedicine } from '../../screens/list/list.steps.ts';
import { reachLoadedList } from '../../flows/reach-loaded-list.flow.ts';
import { test } from '../../fixtures/e2e-test.ts';

test('loaded list shows Paracetamol and opens add medicine', async ({ listPage }) => {
  await reachLoadedList({ listPage });
  await openAddMedicine({ listPage });
});

test('drawer shows ceiling help and ban confirm copy', async ({ drawerPage }) => {
  await openDrawerStory({ drawerPage }, 'loaded');
  await openBanConfirm({ drawerPage });
});

test('add medicine modal shows POST fields', async ({ addModalPage }) => {
  await openAddModalStory({ addModalPage }, 'open');
  await expectOpenAddModal({ addModalPage });
});
