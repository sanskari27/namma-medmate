import { e2eTags, taggedTitle } from '@namma-medmate/e2e-kit';
import { reachLoadedTable } from '../../flows/reach-loaded-table.flow.ts';
import { test } from '../../fixtures/e2e-test.ts';

test(taggedTitle('audit event table is reachable', e2eTags.smoke), async ({ tablePage }) => {
  await reachLoadedTable({ tablePage });
});
