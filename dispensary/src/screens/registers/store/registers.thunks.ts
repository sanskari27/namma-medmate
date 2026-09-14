import { createAsyncThunk } from '@reduxjs/toolkit';
import { isApiError } from '@/services/axios';
import {
  downloadComplianceReport,
  getComplianceReport,
  listComplianceReports,
  type ComplianceReportCatalogItem,
  type ComplianceReportTable,
} from '@/services/complianceReports';
import type { RootState } from '@/store';
import {
  apiStatusHint,
  bookEntitled,
  filenameFor,
  filtersValid,
  firstEntitledKey,
  mapApiStatus,
  toQuery,
  type PageStatus,
} from '../RegistersScreen.utils';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export type RegistersReject = { status: PageStatus; hint: string | null; planLimit?: boolean };

export const loadRegisterCatalog = createAsyncThunk<
  { books: ComplianceReportCatalogItem[]; selectedKey: string | null },
  void,
  { state: RootState; rejectValue: RegistersReject }
>('registers/catalog', async (_, { getState, rejectWithValue }) => {
  if (!getState().auth.user?.activeBranchId) {
    return rejectWithValue({
      status: 'failure',
      hint: 'Select an outlet before opening the register book.',
    });
  }
  try {
    const items = await listComplianceReports();
    const current = getState().registers.selectedKey;
    const selectedKey =
      current && items.some((item) => item.key === current) ? current : firstEntitledKey(items);
    return { books: items, selectedKey };
  } catch (error) {
    return rejectWithValue({
      status: isApiError(error) ? mapApiStatus(error) : 'failure',
      hint: null,
    });
  }
});

export const loadRegisterTable = createAsyncThunk<
  { table: ComplianceReportTable; planGate: boolean; hint: string | null },
  void,
  { state: RootState; rejectValue: RegistersReject }
>('registers/table', async (_, { getState, rejectWithValue }) => {
  const screen = getState().registers;
  if (!screen.selectedKey) {
    return rejectWithValue({ status: 'empty', hint: null });
  }
  const selected = screen.books.find((book) => book.key === screen.selectedKey);
  if (selected && !bookEntitled(selected)) {
        return {
          table: { key: selected.key, title: selected.title, columns: [], items: [], generatedAt: '' },
          planGate: true,
          hint: selected.upgradeHint ?? 'Near-expiry is on Starter. Open the plan to turn it on.',
        };
  }
  if (!filtersValid(screen.filters)) {
    return rejectWithValue({ status: 'validation', hint: null });
  }
  try {
    const table = await getComplianceReport(screen.selectedKey, toQuery(screen.filters));
    return { table, planGate: false, hint: null };
  } catch (error) {
    if (isApiError(error)) {
      return rejectWithValue({
        status: mapApiStatus(error),
        hint: apiStatusHint(error.code),
        planLimit: error.code === 'PLAN_LIMIT',
      });
    }
    return rejectWithValue({ status: 'failure', hint: null });
  }
});

export const exportRegister = createAsyncThunk<
  string,
  'csv' | 'pdf',
  { state: RootState; rejectValue: RegistersReject }
>('registers/export', async (format, { getState, rejectWithValue }) => {
  const screen = getState().registers;
  const selected = screen.books.find((book) => book.key === screen.selectedKey);
  if (!screen.selectedKey || (selected && !bookEntitled(selected)) || screen.planLimit) {
    return rejectWithValue({ status: 'denied', hint: null });
  }
  if (!filtersValid(screen.filters)) {
    return rejectWithValue({ status: 'validation', hint: null });
  }
  try {
    const blob = await downloadComplianceReport(screen.selectedKey, format, toQuery(screen.filters));
    downloadBlob(blob, filenameFor(screen.selectedKey, format));
    return format === 'pdf' ? 'PDF saved for this outlet.' : 'Spreadsheet saved for this outlet.';
  } catch (error) {
    return rejectWithValue({
      status: isApiError(error) ? mapApiStatus(error) : 'failure',
      hint: null,
    });
  }
});
