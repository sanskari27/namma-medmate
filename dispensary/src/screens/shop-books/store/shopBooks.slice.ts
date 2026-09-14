import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { FinanceReportCatalogItem, FinanceReportTable } from '@/services/financeReports';
import type { FilterChipId } from '../ShopBooksScreen.content';
import {
  defaultPeriod,
  type OutletScope,
  type PageStatus,
  type PeriodKind,
  type PeriodSpan,
  type PeriodState,
} from '../ShopBooksScreen.utils';
import { exportShopBook, loadShopBook, loadShopBooksCatalog } from './shopBooks.thunks';

export type ShopBooksScreenState = {
  status: PageStatus;
  statusHint: string | null;
  planGate: boolean;
  upgradeHint: string | null;
  books: FinanceReportCatalogItem[];
  selectedKey: string | null;
  table: FinanceReportTable | null;
  search: string;
  chip: FilterChipId | null;
  period: PeriodState;
  scope: OutletScope;
  busy: boolean;
};

export const initialShopBooksScreenState: ShopBooksScreenState = {
  status: 'loading',
  statusHint: null,
  planGate: false,
  upgradeHint: null,
  books: [],
  selectedKey: null,
  table: null,
  search: '',
  chip: null,
  period: defaultPeriod(),
  scope: 'session',
  busy: false,
};

const shopBooksSlice = createSlice({
  name: 'shopBooks',
  initialState: initialShopBooksScreenState,
  reducers: {
    accessDenied(state, action: PayloadAction<string>) {
      state.status = 'denied';
      state.statusHint = action.payload;
      state.books = [];
      state.table = null;
    },
    hydrateOwnerScope(state, action: PayloadAction<{ owner: boolean; hasBranch: boolean }>) {
      state.scope = action.payload.owner && !action.payload.hasBranch ? 'tenant' : 'session';
    },
    searchChanged(state, action: PayloadAction<string>) {
      state.search = action.payload;
    },
    chipChanged(state, action: PayloadAction<FilterChipId | null>) {
      state.chip = state.chip === action.payload ? null : action.payload;
    },
    bookSelected(state, action: PayloadAction<string | null>) {
      state.selectedKey = action.payload;
      if (!action.payload) {
        state.table = null;
      }
    },
    periodKindChanged(state, action: PayloadAction<PeriodKind>) {
      state.period.kind = action.payload;
    },
    periodSpanChanged(state, action: PayloadAction<PeriodSpan>) {
      state.period.span = action.payload;
    },
    periodPatched(state, action: PayloadAction<Partial<PeriodState>>) {
      state.period = { ...state.period, ...action.payload };
    },
    scopeChanged(state, action: PayloadAction<OutletScope>) {
      state.scope = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadShopBooksCatalog.pending, (state) => {
        if (state.books.length === 0) {
          state.status = 'loading';
        }
      })
      .addCase(loadShopBooksCatalog.fulfilled, (state, action) => {
        state.books = action.payload;
        if (state.books.length === 0) {
          state.status = 'empty';
        }
      })
      .addCase(loadShopBooksCatalog.rejected, (state, action) => {
        state.status = action.payload?.status ?? 'failure';
        state.statusHint = action.payload?.hint ?? null;
      })
      .addCase(loadShopBook.pending, (state) => {
        state.status = 'loading';
        state.statusHint = null;
        state.planGate = false;
      })
      .addCase(loadShopBook.fulfilled, (state, action) => {
        state.table = action.payload;
        state.planGate = false;
        state.upgradeHint = null;
        state.status = action.payload.items.length === 0 ? 'empty' : null;
      })
      .addCase(loadShopBook.rejected, (state, action) => {
        state.status = action.payload?.status ?? 'failure';
        state.statusHint = action.payload?.hint ?? null;
        state.planGate = action.payload?.planGate ?? false;
        state.upgradeHint = action.payload?.upgradeHint ?? null;
        if (state.planGate) {
          state.table = null;
        }
      })
      .addCase(exportShopBook.pending, (state) => {
        state.busy = true;
      })
      .addCase(exportShopBook.fulfilled, (state) => {
        state.busy = false;
        state.status = 'success';
        state.statusHint = 'Shop book file saved.';
      })
      .addCase(exportShopBook.rejected, (state, action) => {
        state.busy = false;
        state.status = action.payload?.status ?? 'failure';
        state.statusHint = action.payload?.hint ?? null;
      });
  },
});

export const shopBooksReducer = shopBooksSlice.reducer;
export const {
  accessDenied,
  hydrateOwnerScope,
  searchChanged,
  chipChanged,
  bookSelected,
  periodKindChanged,
  periodSpanChanged,
  periodPatched,
  scopeChanged,
} = shopBooksSlice.actions;
