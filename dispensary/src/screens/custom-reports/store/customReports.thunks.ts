import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  downloadCustomReport,
  getCustomReportCatalog,
  isApiError,
  previewCustomReport,
  type CustomReportCatalog,
  type CustomReportPreview,
  type CustomReportQuery,
} from '@/services/customReports';
import type { RootState } from '@/store';
import {
  apiStatusHint,
  filenameFor,
  filtersValid,
  isFutureRange,
  mapApiStatus,
  toApiFilters,
  type PageStatus,
} from '../CustomReportsScreen.utils';

export type CustomReportsReject = {
  status: PageStatus;
  hint: string | null;
  planGate?: boolean;
};

function buildQuery(state: RootState['customReports'], owner: boolean): CustomReportQuery {
  return {
    dataset: state.dataset,
    columns: state.columns,
    filters: toApiFilters(state.filter),
    from: state.from,
    to: state.to,
    scope: owner && state.scope === 'tenant' ? 'tenant' : undefined,
  };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function toReject(error: unknown): CustomReportsReject {
  if (isApiError(error)) {
    return {
      status: mapApiStatus(error),
      hint: apiStatusHint(error.code),
      planGate: error.code === 'PLAN_LIMIT',
    };
  }
  return { status: 'failure', hint: null };
}

export const loadCustomReportCatalog = createAsyncThunk<
  CustomReportCatalog,
  void,
  { rejectValue: CustomReportsReject }
>('customReports/loadCatalog', async (_, { rejectWithValue }) => {
  try {
    return await getCustomReportCatalog();
  } catch (error) {
    return rejectWithValue(toReject(error));
  }
});

export const loadCustomReportPreview = createAsyncThunk<
  { preview: CustomReportPreview; status: PageStatus; hint: string | null },
  void,
  { state: RootState; rejectValue: CustomReportsReject }
>('customReports/loadPreview', async (_, { getState, rejectWithValue }) => {
  const root = getState();
  const state = root.customReports;
  const user = root.auth.user;
  const owner = user?.role === 'pharmacy_owner';
  const activeBranchId = user?.activeBranchId ?? null;

  if (state.columns.length === 0) {
    return rejectWithValue({
      status: 'validation',
      hint: 'Pick at least one column before showing rows.',
    });
  }
  if (!filtersValid(state.from, state.to) || isFutureRange(state.to)) {
    return rejectWithValue({
      status: 'validation',
      hint: isFutureRange(state.to)
        ? 'Report dates must be today or earlier.'
        : 'Choose a period that starts on or before the end date.',
    });
  }
  if (!activeBranchId && !(owner && state.scope === 'tenant')) {
    return rejectWithValue({
      status: 'failure',
      hint: 'Select an outlet before building a report.',
    });
  }

  try {
    const preview = await previewCustomReport(buildQuery(state, owner));
    return {
      preview,
      status: preview.items.length === 0 ? 'empty' : 'success',
      hint: null,
    };
  } catch (error) {
    return rejectWithValue(toReject(error));
  }
});

export const exportCustomReport = createAsyncThunk<
  { hint: string },
  'csv' | 'pdf',
  { state: RootState; rejectValue: CustomReportsReject }
>('customReports/export', async (format, { getState, rejectWithValue }) => {
  const root = getState();
  const state = root.customReports;
  const user = root.auth.user;
  const owner = user?.role === 'pharmacy_owner';

  if (state.columns.length === 0) {
    return rejectWithValue({
      status: 'validation',
      hint: 'Pick at least one column before exporting.',
    });
  }
  if (!filtersValid(state.from, state.to)) {
    return rejectWithValue({
      status: 'validation',
      hint: 'Choose a period that starts on or before the end date.',
    });
  }

  try {
    const blob = await downloadCustomReport(buildQuery(state, owner), format);
    downloadBlob(blob, filenameFor(state.dataset, format));
    return {
      hint:
        format === 'pdf'
          ? 'Print file saved for this report.'
          : 'Spreadsheet saved for this report.',
    };
  } catch (error) {
    return rejectWithValue(toReject(error));
  }
});
