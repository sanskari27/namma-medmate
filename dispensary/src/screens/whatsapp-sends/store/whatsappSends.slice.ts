import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { WhatsAppMessage } from '@/services/whatsappMessages';
import type { KindFilter, PageStatus } from '../WhatsappSendsScreen.utils';
import { loadWhatsappSends, retryWhatsappSend } from './whatsappSends.thunks';

export type WhatsappSendsState = {
  status: PageStatus;
  statusHint: string | null;
  items: WhatsAppMessage[];
  queued: number;
  sent: number;
  failed: number;
  kind: KindFilter;
  selectedId: string | null;
  busy: boolean;
};

const whatsappSendsSlice = createSlice({
  name: 'whatsappSends',
  initialState: {
    status: 'loading' as PageStatus,
    statusHint: null as string | null,
    items: [] as WhatsAppMessage[],
    queued: 0,
    sent: 0,
    failed: 0,
    kind: 'ALL' as KindFilter,
    selectedId: null as string | null,
    busy: false,
  },
  reducers: {
    accessDenied(state) {
      state.status = 'denied';
    },
    kindChanged(state, action: PayloadAction<KindFilter>) {
      state.kind = action.payload;
    },
    sendSelected(state, action: PayloadAction<string>) {
      state.selectedId = action.payload;
      state.status = null;
      state.statusHint = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadWhatsappSends.pending, (state) => {
        state.status = 'loading';
        state.statusHint = null;
      })
      .addCase(loadWhatsappSends.fulfilled, (state, action) => {
        state.items = action.payload.items;
        state.queued = action.payload.queued;
        state.sent = action.payload.sent;
        state.failed = action.payload.failed;
        state.selectedId = state.selectedId ?? action.payload.items[0]?.id ?? null;
        state.status = action.payload.items.length === 0 ? 'empty' : null;
      })
      .addCase(loadWhatsappSends.rejected, (state, action) => {
        state.status = action.payload ?? 'failure';
      })
      .addCase(retryWhatsappSend.pending, (state) => {
        state.busy = true;
      })
      .addCase(retryWhatsappSend.fulfilled, (state, action) => {
        state.busy = false;
        state.items = state.items.map((row) => (row.id === action.payload.saved.id ? action.payload.saved : row));
        state.selectedId = action.payload.saved.id;
        state.status = 'success';
        state.statusHint = action.payload.hint;
      })
      .addCase(retryWhatsappSend.rejected, (state, action) => {
        state.busy = false;
        state.status = action.payload?.status ?? 'failure';
        state.statusHint = action.payload?.hint ?? null;
      });
  },
});

export const { accessDenied, kindChanged, sendSelected } = whatsappSendsSlice.actions;
export const whatsappSendsReducer = whatsappSendsSlice.reducer;
