import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { WhatsAppProvider, WhatsAppTemplate } from '@/services/whatsappTemplates';
import type { PageStatus } from '../WhatsappTemplatesScreen.utils';
import { loadWhatsappTemplates, saveWhatsappSlots } from './whatsappTemplates.thunks';

export type WhatsappTemplatesState = {
  status: PageStatus;
  statusHint: string | null;
  templates: WhatsAppTemplate[];
  provider: WhatsAppProvider | null;
  selectedName: string | null;
  values: Record<string, string>;
  busy: boolean;
};

const whatsappTemplatesSlice = createSlice({
  name: 'whatsappTemplates',
  initialState: {
    status: 'loading' as PageStatus,
    statusHint: null as string | null,
    templates: [] as WhatsAppTemplate[],
    provider: null as WhatsAppProvider | null,
    selectedName: null as string | null,
    values: {} as Record<string, string>,
    busy: false,
  },
  reducers: {
    accessDenied(state) {
      state.status = 'denied';
    },
    templateSelected(state, action: PayloadAction<string>) {
      const row = state.templates.find((item) => item.uniqueName === action.payload);
      if (!row) {
        return;
      }
      state.selectedName = row.uniqueName;
      state.values = row.variables ?? {};
      state.status = null;
      state.statusHint = null;
    },
    slotChanged(state, action: PayloadAction<{ slot: string; value: string }>) {
      state.values[action.payload.slot] = action.payload.value;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadWhatsappTemplates.pending, (state) => {
        state.status = 'loading';
        state.statusHint = null;
      })
      .addCase(loadWhatsappTemplates.fulfilled, (state, action) => {
        state.provider = action.payload.provider;
        state.templates = action.payload.templates;
        const keep = action.meta.arg ?? state.selectedName;
        const next =
          action.payload.templates.find((row) => row.uniqueName === keep) ??
          action.payload.templates[0] ??
          null;
        state.selectedName = next?.uniqueName ?? null;
        state.values = next?.variables ?? {};
        state.status = action.payload.templates.length === 0 ? 'empty' : null;
      })
      .addCase(loadWhatsappTemplates.rejected, (state, action) => {
        state.status = action.payload ?? 'failure';
      })
      .addCase(saveWhatsappSlots.pending, (state) => {
        state.busy = true;
      })
      .addCase(saveWhatsappSlots.fulfilled, (state, action) => {
        state.busy = false;
        state.status = 'success';
        state.statusHint = action.payload;
      })
      .addCase(saveWhatsappSlots.rejected, (state, action) => {
        state.busy = false;
        state.status = action.payload?.status ?? 'failure';
        state.statusHint = action.payload?.hint ?? null;
      });
  },
});

export const { accessDenied, templateSelected, slotChanged } = whatsappTemplatesSlice.actions;
export const whatsappTemplatesReducer = whatsappTemplatesSlice.reducer;
