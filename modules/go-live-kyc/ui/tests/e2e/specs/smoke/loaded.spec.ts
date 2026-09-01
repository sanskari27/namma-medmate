import { e2eTags, taggedTitle } from '@namma-medmate/e2e-kit';
import { reachGoLiveWizard } from '../../flows/reach-wizard.flow.ts';
import { test } from '../../fixtures/e2e-test.ts';

test(taggedTitle('go-live wizard story is reachable', e2eTags.smoke), async ({ wizardPage }) => {
  await reachGoLiveWizard({ wizardPage });
});
