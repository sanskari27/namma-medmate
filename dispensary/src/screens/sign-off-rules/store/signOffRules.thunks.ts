import { createAsyncThunk } from '@reduxjs/toolkit';
import { isApiError } from '@/services/axios';
import {
  createApprovalRule,
  listApprovalActions,
  listApprovalRules,
  type ApprovalAction,
  type ApprovalRule,
} from '@/services/approvals';
import type { RootState } from '@/store';
import type { PageStatus } from './signOffRules.slice';

export const loadSignOff = createAsyncThunk<
  { rules: ApprovalRule[]; actions: ApprovalAction[] },
  void,
  { rejectValue: PageStatus }
>('signOffRules/load', async (_, { rejectWithValue }) => {
  try {
    const [rules, actions] = await Promise.all([listApprovalRules(), listApprovalActions()]);
    return { rules, actions };
  } catch (error) {
    if (isApiError(error) && error.code === 'FORBIDDEN') {
      return rejectWithValue('denied');
    }
    return rejectWithValue('failure');
  }
});

export const createSignOffRule = createAsyncThunk<void, void, { state: RootState; rejectValue: string }>(
  'signOffRules/create',
  async (_, { getState, dispatch, rejectWithValue }) => {
    const screen = getState().signOffRules;
    const selected = screen.actions.find((row) => row.actionKey === screen.actionKey) ?? screen.actions[0];
    if (!selected) {
      return rejectWithValue('Pick an action that needs sign-off.');
    }
    const value = Number(screen.threshold);
    if (!Number.isFinite(value) || value < 0) {
      return rejectWithValue('Enter a threshold of zero or more.');
    }
    try {
      await createApprovalRule({
        moduleCode: selected.moduleCode,
        actionKey: selected.actionKey,
        thresholdValue: value,
        approverType: 'ACCOUNT_CLASS',
        approverAccountClass: 'pharmacy_owner',
        allowSelfApproval: false,
      });
      await dispatch(loadSignOff());
    } catch (error) {
      if (isApiError(error) && error.code === 'FORBIDDEN') {
        return rejectWithValue('You need Approvals access to change sign-off rules.');
      }
      if (isApiError(error) && error.code === 'DUPLICATE_RULE') {
        return rejectWithValue('A rule already exists for this action.');
      }
      return rejectWithValue('Could not save this rule. Try again.');
    }
  },
);
