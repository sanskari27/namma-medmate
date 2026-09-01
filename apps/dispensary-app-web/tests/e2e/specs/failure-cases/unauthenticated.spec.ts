import { expectLoginReady, openLogin } from '../../screens/login/index.ts';
import { test } from '../../fixtures/e2e-test.ts';

test('unauthenticated visitors land on chemist login', async ({ loginPage }) => {
  await openLogin({ loginPage });
  await expectLoginReady({ loginPage });
});
