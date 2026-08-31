import { e2eTags, taggedTitle } from '@namma-medmate/e2e-kit';
import { reachLoadedInbox } from '../../flows/reach-loaded-inbox.flow.ts';
import { test } from '../../fixtures/e2e-test.ts';

test(taggedTitle('WhatsApp inbox is reachable', e2eTags.smoke), async ({ inboxPage }) => {
  await reachLoadedInbox({ inboxPage });
});
