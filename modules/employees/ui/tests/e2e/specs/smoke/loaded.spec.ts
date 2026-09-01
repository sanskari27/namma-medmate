import { e2eTags, taggedTitle } from '@namma-medmate/e2e-kit';
import { reachEmployeesDirectory } from '../../flows/reach-employees-directory.flow.ts';
import { test } from '../../fixtures/e2e-test.ts';

test(taggedTitle('employees directory story is reachable', e2eTags.smoke), async ({ listPage }) => {
  await reachEmployeesDirectory({ listPage });
});
