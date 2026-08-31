import {
  expectLoadedHqTable,
  openHqTableStory,
} from '../../screens/hq-audit-event-table/hq-audit-event-table.steps.ts';
import { reachLoadedTable } from '../../flows/reach-loaded-table.flow.ts';
import { test } from '../../fixtures/e2e-test.ts';

test('loaded table shows action and time columns', async ({ tablePage }) => {
  await reachLoadedTable({ tablePage });
});

test('HQ table shows the tenant column', async ({ hqTablePage }) => {
  await openHqTableStory({ hqTablePage }, 'loaded');
  await expectLoadedHqTable({ hqTablePage });
});
