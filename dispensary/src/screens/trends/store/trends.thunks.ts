import { createAsyncThunk } from '@reduxjs/toolkit';
import { getAnalytics, isApiError, type AnalyticsView } from '@/services/analytics';
import type { RootState } from '@/store';
import {
  apiStatusHint,
  isEmptyWindow,
  mapApiStatus,
  type PageStatus,
} from '../TrendsScreen.utils';

export type TrendsReject = {
  status: PageStatus;
  hint: string | null;
  planGate?: boolean;
};

export type TrendsLoadResult = {
  view: AnalyticsView;
  status: PageStatus;
  hint: string | null;
};

export const loadTrends = createAsyncThunk<
  TrendsLoadResult,
  void,
  { state: RootState; rejectValue: TrendsReject }
>('trends/load', async (_, { getState, rejectWithValue }) => {
  const state = getState();
  const user = state.auth.user;
  const owner = user?.role === 'pharmacy_owner';
  const activeBranchId = user?.activeBranchId ?? null;
  const { compare, scope } = state.trends;

  if (!activeBranchId && !(owner && scope === 'tenant')) {
    return rejectWithValue({
      status: 'failure',
      hint: 'Select an outlet before comparing weeks.',
    });
  }

  try {
    const view = await getAnalytics({
      compare,
      scope: owner && scope === 'tenant' ? 'tenant' : undefined,
    });
    if (isEmptyWindow(view.current.salesPaise, view.prior.salesPaise)) {
      return { view, status: 'empty', hint: null };
    }
    return { view, status: 'success', hint: null };
  } catch (error) {
    if (isApiError(error)) {
      return rejectWithValue({
        status: mapApiStatus(error),
        hint: apiStatusHint(error.code),
        planGate: error.code === 'PLAN_LIMIT',
      });
    }
    return rejectWithValue({ status: 'failure', hint: null });
  }
});
