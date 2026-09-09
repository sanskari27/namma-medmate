import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { PrescriptionReference } from '@/services/prescriptionReferences';
import type { RxFilter, RxPageStatus } from '../PrescriptionsScreen.utils';
import {
  archivePrescription,
  loadPrescriptions,
  scanExpiredPrescriptions,
} from './prescriptions.thunks';
import { RX_CONTENT } from '../PrescriptionsScreen.content';

export type PrescriptionsState = {
  status: RxPageStatus;
  statusHint: string | null;
  items: PrescriptionReference[];
  filter: RxFilter;
  query: string;
  selectedId: string | null;
  actionBusy: boolean;
  actionHint: string | null;
};

export const initialPrescriptionsState: PrescriptionsState = {
  status: 'idle',
  statusHint: null,
  items: [],
  filter: 'active',
  query: '',
  selectedId: null,
  actionBusy: false,
  actionHint: null,
};

const prescriptionsSlice = createSlice({
  name: 'prescriptions',
  initialState: initialPrescriptionsState,
  reducers: {
    setRxFilter(state, action: PayloadAction<RxFilter>) {
      state.filter = action.payload;
    },
    setRxQuery(state, action: PayloadAction<string>) {
      state.query = action.payload;
    },
    openRxDetail(state, action: PayloadAction<string>) {
      state.selectedId = action.payload;
      state.actionHint = null;
    },
    closeRxDetail(state) {
      state.selectedId = null;
    },
    clearRxActionHint(state) {
      state.actionHint = null;
    },
    setRxActionHint(state, action: PayloadAction<string | null>) {
      state.actionHint = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadPrescriptions.pending, (state) => {
        state.status = 'loading';
        state.statusHint = null;
      })
      .addCase(loadPrescriptions.fulfilled, (state, action) => {
        state.items = action.payload.items;
        state.status = action.payload.items.length === 0 ? 'empty' : 'ready';
        state.statusHint = null;
      })
      .addCase(loadPrescriptions.rejected, (state, action) => {
        const code = action.payload?.code;
        if (code === 'FORBIDDEN') state.status = 'denied';
        else if (code === 'NO_ACTIVE_BRANCH') state.status = 'no_branch';
        else state.status = 'error';
        state.statusHint = action.payload?.message ?? null;
        state.items = [];
      })
      .addCase(archivePrescription.pending, (state) => {
        state.actionBusy = true;
        state.actionHint = null;
      })
      .addCase(archivePrescription.fulfilled, (state, action) => {
        state.actionBusy = false;
        const next = action.payload;
        const idx = state.items.findIndex((row) => row.id === next.id);
        if (idx >= 0) state.items[idx] = next;
        else state.items.unshift(next);
        state.actionHint = RX_CONTENT.status.successArchive;
        if (state.filter === 'active') state.selectedId = null;
      })
      .addCase(archivePrescription.rejected, (state, action) => {
        state.actionBusy = false;
        state.actionHint = action.payload?.message ?? RX_CONTENT.status.failure;
      })
      .addCase(scanExpiredPrescriptions.pending, (state) => {
        state.actionBusy = true;
        state.actionHint = null;
      })
      .addCase(scanExpiredPrescriptions.fulfilled, (state, action) => {
        state.actionBusy = false;
        state.items = action.payload.items;
        state.status = action.payload.items.length === 0 ? 'empty' : 'ready';
        state.actionHint =
          action.payload.archived === 0
            ? RX_CONTENT.status.successScanNone
            : RX_CONTENT.status.successScan(action.payload.archived);
      })
      .addCase(scanExpiredPrescriptions.rejected, (state, action) => {
        state.actionBusy = false;
        state.actionHint = action.payload?.message ?? RX_CONTENT.status.failure;
      });
  },
});

export const {
  setRxFilter,
  setRxQuery,
  openRxDetail,
  closeRxDetail,
  clearRxActionHint,
  setRxActionHint,
} = prescriptionsSlice.actions;

export const prescriptionsReducer = prescriptionsSlice.reducer;
