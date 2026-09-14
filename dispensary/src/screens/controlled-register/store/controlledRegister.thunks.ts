import { createAsyncThunk } from '@reduxjs/toolkit';
import { isApiError } from '@/services/axios';
import {
  downloadControlledRegisterExport,
  listControlledRegister,
  type ControlledSaleLine,
} from '@/services/controlledRegister';
import type { RootState } from '@/store';
import { filtersValid, mapApiStatus, toQuery, type PageStatus } from '../ControlledRegisterScreen.utils';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export type ControlledReject = { status: PageStatus; hint: string | null };

export const loadControlledRegister = createAsyncThunk<
  ControlledSaleLine[],
  void,
  { state: RootState; rejectValue: ControlledReject }
>('controlledRegister/load', async (_, { getState, rejectWithValue }) => {
  const filters = getState().controlledRegister.filters;
  if (!filtersValid(filters)) {
    return rejectWithValue({ status: 'validation', hint: null });
  }
  if (!getState().auth.user?.activeBranchId) {
    return rejectWithValue({
      status: 'failure',
      hint: 'Select an outlet before opening the NDPS sale book.',
    });
  }
  try {
    return await listControlledRegister(toQuery(filters));
  } catch (error) {
    return rejectWithValue({
      status: isApiError(error) ? mapApiStatus(error) : 'failure',
      hint: null,
    });
  }
});

export const exportControlledRegister = createAsyncThunk<
  string,
  'csv' | 'ndps',
  { state: RootState; rejectValue: ControlledReject }
>('controlledRegister/export', async (format, { getState, rejectWithValue }) => {
  const filters = getState().controlledRegister.filters;
  if (!filtersValid(filters)) {
    return rejectWithValue({ status: 'validation', hint: null });
  }
  try {
    const blob = await downloadControlledRegisterExport(format, toQuery(filters));
    downloadBlob(blob, format === 'ndps' ? 'ndps-sale-register.csv' : 'controlled-sale-register.csv');
    return format === 'ndps' ? 'NDPS sheet saved for this outlet.' : 'Spreadsheet saved for this outlet.';
  } catch (error) {
    return rejectWithValue({
      status: isApiError(error) ? mapApiStatus(error) : 'failure',
      hint: null,
    });
  }
});
