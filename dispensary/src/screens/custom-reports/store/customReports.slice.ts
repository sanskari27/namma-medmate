import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type {
  CustomReportCatalog,
  CustomReportPreview,
} from '@/services/customReports';
import {
  emptyDraft,
  todayIst,
  type FilterDraft,
  type OutletScope,
  type PageStatus,
} from '../CustomReportsScreen.utils';
import type { CatalogFilterChip } from '../CustomReportsScreen.content';
import {
  exportCustomReport,
  loadCustomReportCatalog,
  loadCustomReportPreview,
} from './customReports.thunks';

export type BuilderTab = 'columns' | 'filters' | 'preview';

export type CustomReportsScreenState = {
  status: PageStatus;
  statusHint: string | null;
  planGate: boolean;
  catalog: CustomReportCatalog | null;
  preview: CustomReportPreview | null;
  dataset: string;
  columns: string[];
  filter: FilterDraft;
  from: string;
  to: string;
  scope: OutletScope;
  busy: boolean;
  mode: 'catalog' | 'builder';
  catalogQuery: string;
  catalogChip: CatalogFilterChip;
  builderTab: BuilderTab;
};

export const initialCustomReportsScreenState: CustomReportsScreenState = {
  status: 'loading',
  statusHint: null,
  planGate: false,
  catalog: null,
  preview: null,
  dataset: 'SALES',
  columns: [],
  filter: emptyDraft(),
  from: todayIst(),
  to: todayIst(),
  scope: 'session',
  busy: false,
  mode: 'catalog',
  catalogQuery: '',
  catalogChip: 'All',
  builderTab: 'preview',
};

const customReportsSlice = createSlice({
  name: 'customReports',
  initialState: initialCustomReportsScreenState,
  reducers: {
    accessDenied(state, action: PayloadAction<string>) {
      state.status = 'denied';
      state.statusHint = action.payload;
      state.planGate = false;
      state.busy = false;
    },
    hydrateOwnerScope(state, action: PayloadAction<{ owner: boolean; hasBranch: boolean }>) {
      state.scope = action.payload.owner && !action.payload.hasBranch ? 'tenant' : 'session';
    },
    catalogQueryChanged(state, action: PayloadAction<string>) {
      state.catalogQuery = action.payload;
    },
    catalogChipChanged(state, action: PayloadAction<CatalogFilterChip>) {
      state.catalogChip = action.payload;
    },
    openDataset(state, action: PayloadAction<string>) {
      const next = state.catalog?.datasets.find((item) => item.key === action.payload);
      state.dataset = action.payload;
      state.columns = next ? next.fields.map((field) => field.key) : [];
      state.filter = emptyDraft();
      state.preview = null;
      state.mode = 'builder';
      state.builderTab = 'preview';
      state.statusHint = null;
    },
    backToCatalog(state) {
      state.mode = 'catalog';
      state.preview = null;
      state.statusHint = null;
      if (state.catalog) {
        state.status = 'success';
      }
    },
    builderTabChanged(state, action: PayloadAction<BuilderTab>) {
      state.builderTab = action.payload;
    },
    columnsToggled(state, action: PayloadAction<string>) {
      const key = action.payload;
      state.columns = state.columns.includes(key)
        ? state.columns.filter((item) => item !== key)
        : [...state.columns, key];
    },
    filterChanged(state, action: PayloadAction<FilterDraft>) {
      state.filter = action.payload;
    },
    fromChanged(state, action: PayloadAction<string>) {
      state.from = action.payload;
    },
    toChanged(state, action: PayloadAction<string>) {
      state.to = action.payload;
    },
    scopeChanged(state, action: PayloadAction<OutletScope>) {
      state.scope = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadCustomReportCatalog.pending, (state) => {
        state.status = 'loading';
        state.statusHint = null;
        state.planGate = false;
      })
      .addCase(loadCustomReportCatalog.fulfilled, (state, action) => {
        state.catalog = action.payload;
        state.status = 'success';
        const first = action.payload.datasets[0];
        if (first && state.columns.length === 0) {
          state.dataset = first.key;
          state.columns = first.fields.map((field) => field.key);
        }
      })
      .addCase(loadCustomReportCatalog.rejected, (state, action) => {
        state.status = action.payload?.status ?? 'failure';
        state.statusHint = action.payload?.hint ?? null;
        state.planGate = action.payload?.planGate ?? false;
      })
      .addCase(loadCustomReportPreview.pending, (state) => {
        state.busy = true;
        state.status = 'loading';
        state.statusHint = null;
      })
      .addCase(loadCustomReportPreview.fulfilled, (state, action) => {
        state.busy = false;
        state.preview = action.payload.preview;
        state.status = action.payload.status;
        state.statusHint = action.payload.hint;
        state.builderTab = 'preview';
      })
      .addCase(loadCustomReportPreview.rejected, (state, action) => {
        state.busy = false;
        state.preview = null;
        state.status = action.payload?.status ?? 'failure';
        state.statusHint = action.payload?.hint ?? null;
        state.planGate = action.payload?.planGate ?? false;
      })
      .addCase(exportCustomReport.pending, (state) => {
        state.busy = true;
      })
      .addCase(exportCustomReport.fulfilled, (state, action) => {
        state.busy = false;
        state.status = 'success';
        state.statusHint = action.payload.hint;
      })
      .addCase(exportCustomReport.rejected, (state, action) => {
        state.busy = false;
        state.status = action.payload?.status ?? 'failure';
        state.statusHint = action.payload?.hint ?? null;
        state.planGate = action.payload?.planGate ?? false;
      });
  },
});

export const {
  accessDenied,
  hydrateOwnerScope,
  catalogQueryChanged,
  catalogChipChanged,
  openDataset,
  backToCatalog,
  builderTabChanged,
  columnsToggled,
  filterChanged,
  fromChanged,
  toChanged,
  scopeChanged,
} = customReportsSlice.actions;

export const customReportsReducer = customReportsSlice.reducer;
