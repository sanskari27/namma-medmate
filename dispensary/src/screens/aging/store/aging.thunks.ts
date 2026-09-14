import { createAsyncThunk } from '@reduxjs/toolkit';
import { getPayables, getReceivables, isApiError, type AgingReport } from '@/services/aging';
import type { RootState } from '@/store';
import {
  apiStatusHint,
  isFutureAsOf,
  mapApiStatus,
  resolveAsOf,
  type PageStatus,
} from '../AgingScreen.utils';

export type AgingReject = {
  status: PageStatus;
  hint: string | null;
  planGate?: boolean;
};

export const loadAging = createAsyncThunk<
  { receivables: AgingReport; payables: AgingReport },
  void,
  { state: RootState; rejectValue: AgingReject }
>('aging/load', async (_, { getState, rejectWithValue }) => {
  const screen = getState().aging;
  const owner = getState().auth.user?.role === 'pharmacy_owner';
  const asOf = resolveAsOf(screen.periodKind, screen.month, screen.customAsOf);
  if (isFutureAsOf(asOf)) {
    return rejectWithValue({
      status: 'validation',
      hint: 'As-of date must be today or earlier.',
    });
  }
  try {
    const query = {
      asOf,
      scope: owner && screen.scope === 'tenant' ? ('tenant' as const) : undefined,
    };
    const [receivables, payables] = await Promise.all([getReceivables(query), getPayables(query)]);
    return { receivables, payables };
  } catch (error) {
    if (isApiError(error)) {
      return rejectWithValue({
        status: mapApiStatus(error),
        hint: apiStatusHint(error.code) ?? error.message,
        planGate: error.code === 'PLAN_LIMIT',
      });
    }
    return rejectWithValue({ status: 'failure', hint: null });
  }
});
