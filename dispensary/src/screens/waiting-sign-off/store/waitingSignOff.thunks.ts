import { createAsyncThunk } from '@reduxjs/toolkit';
import { isApiError } from '@/services/axios';
import {
  decideApproval,
  listPendingApprovals,
  type ApprovalRequest,
} from '@/services/approvals';
import type { WaitingStatus } from './waitingSignOff.slice';

export const loadWaiting = createAsyncThunk<ApprovalRequest[], void, { rejectValue: WaitingStatus }>(
  'waitingSignOff/load',
  async (_, { rejectWithValue }) => {
    try {
      return await listPendingApprovals();
    } catch (error) {
      if (isApiError(error) && error.code === 'FORBIDDEN') {
        return rejectWithValue('denied');
      }
      return rejectWithValue('failure');
    }
  },
);

export const decideSignOff = createAsyncThunk<
  void,
  { request: ApprovalRequest; outcome: 'APPROVED' | 'REJECTED' },
  { rejectValue: string }
>('waitingSignOff/decide', async ({ request, outcome }, { dispatch, rejectWithValue }) => {
  try {
    await decideApproval(request.id, outcome, request.version);
    await dispatch(loadWaiting());
  } catch (error) {
    if (isApiError(error) && error.code === 'SELF_APPROVAL') {
      return rejectWithValue('You cannot approve your own request.');
    }
    if (isApiError(error) && (error.code === 'STALE_STATE' || error.code === 'THRESHOLD_CHANGED')) {
      return rejectWithValue('This request changed. Refresh and try again.');
    }
    if (isApiError(error) && error.code === 'FORBIDDEN') {
      return rejectWithValue('You are not an approver for this request.');
    }
    return rejectWithValue('Could not record that sign-off. Try again.');
  }
});
