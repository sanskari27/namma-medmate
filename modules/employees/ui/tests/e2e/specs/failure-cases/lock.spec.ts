import { expectStarterLock, openPlanLock } from '../../screens/lock/lock.steps.ts';
import { expectLoadError, openListStory } from '../../screens/list/list.steps.ts';
import { test } from '../../fixtures/e2e-test.ts';

test('Free lock names Starter and hides the staff table', async ({ lockPage }) => {
  await openPlanLock({ lockPage });
  await expectStarterLock({ lockPage });
});

test('Load error shows an alert', async ({ listPage }) => {
  await openListStory({ listPage }, 'load-error');
  await expectLoadError({ listPage });
});
