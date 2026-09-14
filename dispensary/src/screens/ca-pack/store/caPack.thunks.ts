import { createAsyncThunk } from '@reduxjs/toolkit';
import { listBranches } from '@/services/branches';
import { downloadCaPack, getCaPack, isApiError, type CaPack } from '@/services/caPack';
import type { RootState } from '@/store';
import { SHARE_TOGGLES } from '../CaPackScreen.content';
import {
  apiStatusHint,
  mapApiStatus,
  periodOptions,
  saveHistory,
  selectedKeys,
  type PageStatus,
  type ShareHistoryItem,
} from '../CaPackScreen.utils';

export type CaPackReject = {
  status: PageStatus;
  hint: string | null;
};

function queryFrom(state: RootState) {
  const screen = state.caPack;
  const owner = state.auth.user?.role === 'pharmacy_owner';
  const option = periodOptions().find((row) => row.key === screen.periodKey) ?? periodOptions()[0];
  return {
    from: option?.from,
    to: option?.to,
    scope: owner && screen.scope === 'tenant' ? 'tenant' : undefined,
  };
}

export const loadCaPack = createAsyncThunk<
  { pack: CaPack; gstin: string },
  void,
  { state: RootState; rejectValue: CaPackReject }
>('caPack/load', async (_, { getState, rejectWithValue }) => {
  try {
    const [pack, branches] = await Promise.all([getCaPack(queryFrom(getState())), listBranches().catch(() => [])]);
    const active = getState().auth.user?.activeBranchId;
    const branch = branches.find((row) => row.id === active) ?? branches[0];
    return { pack, gstin: branch?.gstin?.trim() || '—' };
  } catch (error) {
    if (isApiError(error)) {
      return rejectWithValue({
        status: mapApiStatus(error),
        hint: apiStatusHint(error.code) ?? error.message,
      });
    }
    return rejectWithValue({ status: 'failure', hint: null });
  }
});

export const downloadCaPackFile = createAsyncThunk<
  { item: ShareHistoryItem; history: ShareHistoryItem[] },
  void,
  { state: RootState; rejectValue: CaPackReject }
>('caPack/download', async (_, { getState, rejectWithValue }) => {
  const state = getState().caPack;
  const keys = selectedKeys(state.enabled);
  if (keys.length === 0) {
    return rejectWithValue({ status: 'validation', hint: 'Choose at least one report to share.' });
  }
  const option = periodOptions().find((row) => row.key === state.periodKey) ?? periodOptions()[0];
  const advisor = state.advisors.find((row) => row.id === state.advisorId);
  try {
    const blob = await downloadCaPack({
      ...queryFrom(getState()),
      sections: keys.join(','),
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'ca-pack.pdf';
    anchor.click();
    URL.revokeObjectURL(url);
    const item: ShareHistoryItem = {
      id: `${Date.now()}`,
      at: new Date().toISOString(),
      period: option?.label ?? '',
      advisorName: advisor?.name || 'Downloaded',
      reports: SHARE_TOGGLES.filter((row) => state.enabled[row.id]).map((row) => row.label),
    };
    const next = [item, ...state.history];
    saveHistory(next);
    return { item, history: next };
  } catch (error) {
    if (isApiError(error)) {
      return rejectWithValue({
        status: mapApiStatus(error),
        hint: apiStatusHint(error.code) ?? error.message,
      });
    }
    return rejectWithValue({ status: 'failure', hint: null });
  }
});
