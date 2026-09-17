import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { CaPack } from '@/services/caPack';
import {
  defaultEnabled,
  loadAdvisors,
  loadHistory,
  periodOptions,
  type Advisor,
  type OutletScope,
  type PageStatus,
  type ShareHistoryItem,
} from '../CaPackScreen.utils';
import type { ShareToggleId } from '../CaPackScreen.content';
import { downloadCaPackFile, loadCaPack } from './caPack.thunks';

export type CaPackScreenState = {
  status: PageStatus;
  statusHint: string | null;
  pack: CaPack | null;
  gstin: string;
  periodKey: string;
  scope: OutletScope;
  enabled: Record<ShareToggleId, boolean>;
  advisorId: string;
  advisors: Advisor[];
  history: ShareHistoryItem[];
  formOpen: boolean;
  form: Advisor | null;
  busy: boolean;
  gstAvailable: boolean;
};

const options = periodOptions();

export const initialCaPackScreenState: CaPackScreenState = {
  status: 'loading',
  statusHint: null,
  pack: null,
  gstin: '—',
  periodKey: options[0]?.key ?? '',
  scope: 'session',
  enabled: defaultEnabled(),
  advisorId: '',
  advisors: loadAdvisors(),
  history: loadHistory(),
  formOpen: false,
  form: null,
  busy: false,
  gstAvailable: true,
};

const caPackSlice = createSlice({
  name: 'caPack',
  initialState: initialCaPackScreenState,
  reducers: {
    accessDenied(state, action: PayloadAction<string>) {
      state.status = 'denied';
      state.statusHint = action.payload;
      state.pack = null;
    },
    hydrateOwnerScope(state, action: PayloadAction<{ owner: boolean; hasBranch: boolean }>) {
      state.scope = action.payload.owner && !action.payload.hasBranch ? 'tenant' : 'session';
    },
    periodKeyChanged(state, action: PayloadAction<string>) {
      state.periodKey = action.payload;
    },
    scopeChanged(state, action: PayloadAction<OutletScope>) {
      state.scope = action.payload;
    },
    toggleChanged(state, action: PayloadAction<{ id: ShareToggleId; on: boolean }>) {
      state.enabled[action.payload.id] = action.payload.on;
    },
    advisorSelected(state, action: PayloadAction<string>) {
      state.advisorId = action.payload;
    },
    openAdvisorForm(state, action: PayloadAction<Advisor>) {
      state.formOpen = true;
      state.form = action.payload;
    },
    closeAdvisorForm(state) {
      state.formOpen = false;
      state.form = null;
    },
    patchAdvisorForm(state, action: PayloadAction<Partial<Advisor>>) {
      if (state.form) {
        state.form = { ...state.form, ...action.payload };
      }
    },
    advisorsSaved(state, action: PayloadAction<Advisor[]>) {
      state.advisors = action.payload;
      if (action.payload.length > 0 && !action.payload.some((row) => row.id === state.advisorId)) {
        state.advisorId = action.payload[0].id;
      }
      if (action.payload.length === 0) {
        state.advisorId = '';
      }
    },
    historySaved(state, action: PayloadAction<ShareHistoryItem[]>) {
      state.history = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadCaPack.pending, (state) => {
        state.status = 'loading';
        state.statusHint = null;
      })
      .addCase(loadCaPack.fulfilled, (state, action) => {
        state.pack = action.payload.pack;
        state.gstin = action.payload.gstin;
        const keys = new Set(action.payload.pack.sections.map((section) => section.key));
        state.gstAvailable = keys.has('GSTR1') || keys.has('GSTR3B');
        if (!state.gstAvailable) {
          state.enabled.gst = false;
        }
        const empty = action.payload.pack.sections.every((section) => section.items.length === 0);
        state.status = empty ? 'empty' : null;
        if (!state.advisorId && state.advisors[0]) {
          state.advisorId = state.advisors[0].id;
        }
      })
      .addCase(loadCaPack.rejected, (state, action) => {
        state.status = action.payload?.status ?? 'failure';
        state.statusHint = action.payload?.hint ?? null;
      })
      .addCase(downloadCaPackFile.pending, (state) => {
        state.busy = true;
      })
      .addCase(downloadCaPackFile.fulfilled, (state, action) => {
        state.busy = false;
        state.status = 'success';
        state.statusHint = 'CA pack saved. Hand this file to the CA.';
        state.history = action.payload.history;
      })
      .addCase(downloadCaPackFile.rejected, (state, action) => {
        state.busy = false;
        state.status = action.payload?.status ?? 'failure';
        state.statusHint = action.payload?.hint ?? null;
      });
  },
});

export const caPackReducer = caPackSlice.reducer;
export const {
  accessDenied,
  hydrateOwnerScope,
  periodKeyChanged,
  scopeChanged,
  toggleChanged,
  advisorSelected,
  openAdvisorForm,
  closeAdvisorForm,
  patchAdvisorForm,
  advisorsSaved,
  historySaved,
} = caPackSlice.actions;
