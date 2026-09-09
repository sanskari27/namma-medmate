import { createAsyncThunk } from '@reduxjs/toolkit';
import { isApiError } from '@/services/axios';
import { fetchHomeDashboard, type DashboardPeriod } from '@/services/homeDashboard';
import type { RootState } from '@/store';
import {
  apiStatusHint,
  mapApiStatus,
  type PageStatus,
} from '../DashboardScreen.utils';

type DashboardReject = { status: PageStatus; hint: string | null };

export const loadDashboard = createAsyncThunk<
  Awaited<ReturnType<typeof fetchHomeDashboard>>,
  void,
  { state: RootState; rejectValue: DashboardReject }
>('dashboard/load', async (_, { getState, rejectWithValue }) => {
  const period = getState().dashboard.period;
  try {
    return await fetchHomeDashboard(period);
  } catch (error) {
    return rejectWithValue(toDashboardReject(error));
  }
});

export const reloadDashboardPeriod = createAsyncThunk<
  Awaited<ReturnType<typeof fetchHomeDashboard>>,
  DashboardPeriod,
  { rejectValue: DashboardReject }
>('dashboard/reloadPeriod', async (period, { rejectWithValue }) => {
  try {
    return await fetchHomeDashboard(period);
  } catch (error) {
    return rejectWithValue(toDashboardReject(error));
  }
});

function toDashboardReject(error: unknown): DashboardReject {
  if (!isApiError(error)) {
    return { status: 'failure', hint: null };
  }
  const status = mapApiStatus(error);
  const hint = apiStatusHint(error.code);
  if (hint) {
    return { status, hint };
  }
  // Prefer screen status copy for mapped auth / conflict / validation codes.
  if (status === 'denied' || status === 'conflict' || status === 'validation') {
    return { status, hint: null };
  }
  return { status, hint: error.message || null };
}
