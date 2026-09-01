import { buildSuccess } from '@namma-medmate/response-envelope';
import type { AuthedRequest } from '../http/parse-auth.ts';
import { shareLink } from '../ops.ts';
import type { ManageUsersRuntime } from '../runtime.ts';

export function createShareLinkController(runtime: ManageUsersRuntime) {
  return async function shareLinkController(input: AuthedRequest) {
    return buildSuccess(await shareLink(runtime, input));
  };
}
