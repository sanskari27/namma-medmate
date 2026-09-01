import { e2eTags, taggedTitle } from '@namma-medmate/e2e-kit';
import { reachLoadedList } from '../../flows/reach-loaded-list.flow.ts';
import { test } from '../../fixtures/e2e-test.ts';

test(taggedTitle('master catalogue list is reachable', e2eTags.smoke), async ({ listPage }) => {
  await reachLoadedList({ listPage });
});
