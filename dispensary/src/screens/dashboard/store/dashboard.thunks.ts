import { createAsyncThunk } from '@reduxjs/toolkit';
import { isApiError } from '@/services/axios';
import { fetchDashboard, type DashboardView } from '@/services/dashboards';
import { fetchHomeDashboard, type DashboardPeriod, type HomeDashboardView } from '@/services/homeDashboard';
import type { RootState } from '@/store';
import {
  apiStatusHint,
  defaultDesk,
  isEmptyView,
  mapApiStatus,
  type DashboardDesk,
  type PageStatus,
} from '../DashboardScreen.utils';

type DashboardReject = { status: PageStatus; hint: string | null };

export type DashboardLoadResult =
  | { kind: 'home'; desk: 'owner'; home: HomeDashboardView }
  | { kind: 'desk'; desk: DashboardDesk; deskView: DashboardView };

export const loadDashboard = createAsyncThunk<
  DashboardLoadResult,
  DashboardDesk | null | undefined,
  { state: RootState; rejectValue: DashboardReject }
>('dashboard/load', async (requested, { getState, rejectWithValue }) => {
  const user = getState().auth.user;
  const desk = requested === undefined ? defaultDesk(user) : requested;
  if (user && !desk) {
    return rejectWithValue({ status: 'denied', hint: null });
  }
  const period = getState().dashboard.period;
  try {
    if (!desk || desk === 'owner') {
      return { kind: 'home', desk: 'owner', home: await fetchHomeDashboard(period) };
    }
    return { kind: 'desk', desk, deskView: await fetchDashboard(desk, {}) };
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

export function deskStatusForView(desk: DashboardDesk, view: DashboardView): PageStatus {
  return isEmptyView(desk, view) ? 'empty' : 'success';
}

function toDashboardReject(error: unknown): DashboardReject {
  if (!isApiError(error)) {
    return { status: 'failure', hint: null };
  }
  const status = mapApiStatus(error);
  const hint = apiStatusHint(error.code);
  if (hint) {
    return { status, hint };
  }
  if (status === 'denied' || status === 'conflict' || status === 'validation') {
    return { status, hint: null };
  }
  return { status, hint: error.message || null };
}
