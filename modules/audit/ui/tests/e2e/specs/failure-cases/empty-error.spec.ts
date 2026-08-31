import {
  expectEmptyTable,
  expectErrorTable,
  openTableStory,
} from '../../screens/audit-event-table/audit-event-table.steps.ts';
import { test } from '../../fixtures/e2e-test.ts';

test('empty audit table shows the empty copy', async ({ tablePage }) => {
  await openTableStory({ tablePage }, 'empty');
  await expectEmptyTable({ tablePage });
});

test('error audit table shows the alert', async ({ tablePage }) => {
  await openTableStory({ tablePage }, 'load-error');
  await expectErrorTable({ tablePage });
});
