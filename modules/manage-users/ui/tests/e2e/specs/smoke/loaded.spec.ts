import { e2eTags, taggedTitle } from '@namma-medmate/e2e-kit';
import { reachManageUsersList } from '../../flows/reach-manage-users-list.flow.ts';
import { test } from '../../fixtures/e2e-test.ts';

test(taggedTitle('manage users list story is reachable', e2eTags.smoke), async ({ listPage }) => {
  await reachManageUsersList({ listPage });
});
