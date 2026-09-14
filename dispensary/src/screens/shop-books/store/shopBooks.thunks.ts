import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  downloadFinanceReport,
  getFinanceReport,
  isApiError,
  listFinanceReports,
  type FinanceReportCatalogItem,
  type FinanceReportTable,
} from '@/services/financeReports';
import type { RootState } from '@/store';
import {
  apiStatusHint,
  bookEntitled,
  filenameFor,
  firstEntitledKey,
  isFutureRange,
  mapApiStatus,
  rangeValid,
  resolveRange,
  type PageStatus,
} from '../ShopBooksScreen.utils';

export type ShopBooksReject = {
  status: PageStatus;
  hint: string | null;
  planGate?: boolean;
  upgradeHint?: string | null;
};

function queryFrom(state: RootState) {
  const screen = state.shopBooks;
  const owner = state.auth.user?.role === 'pharmacy_owner';
  const range = resolveRange(screen.period);
  return {
    ...range,
    scope: owner && screen.scope === 'tenant' ? 'tenant' : undefined,
  };
}

export const loadShopBooksCatalog = createAsyncThunk<
  FinanceReportCatalogItem[],
  void,
  { state: RootState; rejectValue: ShopBooksReject }
>('shopBooks/catalog', async (_, { getState, rejectWithValue }) => {
  try {
    return await listFinanceReports(queryFrom(getState()));
  } catch (error) {
    if (isApiError(error)) {
      return rejectWithValue({
        status: mapApiStatus(error),
        hint: apiStatusHint(error.code),
      });
    }
    return rejectWithValue({ status: 'failure', hint: null });
  }
});

export const loadShopBook = createAsyncThunk<
  FinanceReportTable,
  string | void,
  { state: RootState; rejectValue: ShopBooksReject }
>('shopBooks/table', async (keyArg, { getState, rejectWithValue }) => {
  const state = getState();
  const key = keyArg || state.shopBooks.selectedKey || firstEntitledKey(state.shopBooks.books);
  if (!key) {
    return rejectWithValue({ status: 'empty', hint: null });
  }
  const selected = state.shopBooks.books.find((book) => book.key === key);
  if (selected && !bookEntitled(selected)) {
    return rejectWithValue({
      status: 'denied',
      hint: selected.upgradeHint ?? 'This shop book is on Growth. Open the plan to turn it on.',
      planGate: true,
      upgradeHint: selected.upgradeHint ?? null,
    });
  }
  const query = queryFrom(state);
  if (!rangeValid(query.from, query.to) || isFutureRange(query.to)) {
    return rejectWithValue({
      status: 'validation',
      hint: isFutureRange(query.to)
        ? 'Report dates must be today or earlier.'
        : 'Choose a period that starts on or before the end date.',
    });
  }
  try {
    return await getFinanceReport(key, query);
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

export const exportShopBook = createAsyncThunk<
  void,
  'csv' | 'pdf',
  { state: RootState; rejectValue: ShopBooksReject }
>('shopBooks/export', async (format, { getState, rejectWithValue }) => {
  const state = getState();
  const key = state.shopBooks.selectedKey;
  if (!key || state.shopBooks.planGate) {
    return rejectWithValue({ status: 'denied', hint: 'This shop book is not available to export.' });
  }
  const query = queryFrom(state);
  try {
    const blob = await downloadFinanceReport(key, format, query);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filenameFor(key, format);
    anchor.click();
    URL.revokeObjectURL(url);
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
