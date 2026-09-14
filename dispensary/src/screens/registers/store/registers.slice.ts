import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ComplianceReportCatalogItem, ComplianceReportTable } from '@/services/complianceReports';
import { emptyFilters, type FilterState, type PageStatus } from '../RegistersScreen.utils';
import { exportRegister, loadRegisterCatalog, loadRegisterTable } from './registers.thunks';

export type RegistersState = {
  status: PageStatus;
  statusHint: string | null;
  books: ComplianceReportCatalogItem[];
  selectedKey: string | null;
  table: ComplianceReportTable | null;
  filters: FilterState;
  busy: boolean;
  planLimit: boolean;
};

const registersSlice = createSlice({
  name: 'registers',
  initialState: {
    status: 'loading' as PageStatus,
    statusHint: null as string | null,
    books: [] as ComplianceReportCatalogItem[],
    selectedKey: null as string | null,
    table: null as ComplianceReportTable | null,
    filters: emptyFilters(),
    busy: false,
    planLimit: false,
  },
  reducers: {
    accessDenied(state, action: PayloadAction<string | null>) {
      state.status = 'denied';
      state.statusHint = action.payload;
    },
    bookSelected(state, action: PayloadAction<string>) {
      state.selectedKey = action.payload;
    },
    filtersChanged(state, action: PayloadAction<FilterState>) {
      state.filters = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadRegisterCatalog.pending, (state) => {
        state.status = 'loading';
        state.statusHint = null;
      })
      .addCase(loadRegisterCatalog.fulfilled, (state, action) => {
        state.books = action.payload.books;
        state.selectedKey = action.payload.selectedKey;
        if (action.payload.books.length === 0) {
          state.status = 'empty';
        }
      })
      .addCase(loadRegisterCatalog.rejected, (state, action) => {
        state.status = action.payload?.status ?? 'failure';
        state.statusHint = action.payload?.hint ?? null;
      })
      .addCase(loadRegisterTable.pending, (state) => {
        state.status = 'loading';
        state.statusHint = null;
        state.planLimit = false;
      })
      .addCase(loadRegisterTable.fulfilled, (state, action) => {
        if (action.payload.planGate) {
          state.table = null;
          state.planLimit = false;
          state.status = 'denied';
          state.statusHint = action.payload.hint;
          return;
        }
        state.table = action.payload.table;
        state.status = action.payload.table.items.length === 0 ? 'empty' : null;
      })
      .addCase(loadRegisterTable.rejected, (state, action) => {
        state.status = action.payload?.status ?? 'failure';
        state.statusHint = action.payload?.hint ?? null;
        if (action.payload?.planLimit) {
          state.table = null;
          state.planLimit = true;
        }
      })
      .addCase(exportRegister.pending, (state) => {
        state.busy = true;
      })
      .addCase(exportRegister.fulfilled, (state, action) => {
        state.busy = false;
        state.status = 'success';
        state.statusHint = action.payload;
      })
      .addCase(exportRegister.rejected, (state, action) => {
        state.busy = false;
        state.status = action.payload?.status ?? 'failure';
        state.statusHint = action.payload?.hint ?? null;
      });
  },
});

export const { accessDenied, bookSelected, filtersChanged } = registersSlice.actions;
export const registersReducer = registersSlice.reducer;
