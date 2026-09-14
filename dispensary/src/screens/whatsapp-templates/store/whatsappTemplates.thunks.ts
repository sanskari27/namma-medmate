import { createAsyncThunk } from '@reduxjs/toolkit';
import { isApiError } from '@/services/axios';
import {
  listWhatsAppTemplates,
  saveWhatsAppVariables,
  type WhatsAppOwnerCatalogue,
} from '@/services/whatsappTemplates';
import type { RootState } from '@/store';
import {
  apiStatusHint,
  mapApiStatus,
  slotsFilled,
  type PageStatus,
} from '../WhatsappTemplatesScreen.utils';

export const loadWhatsappTemplates = createAsyncThunk<
  WhatsAppOwnerCatalogue,
  string | null | undefined,
  { rejectValue: PageStatus }
>('whatsappTemplates/load', async (_, { rejectWithValue }) => {
  try {
    return await listWhatsAppTemplates();
  } catch (error) {
    return rejectWithValue(isApiError(error) ? mapApiStatus(error) : 'failure');
  }
});

export const saveWhatsappSlots = createAsyncThunk<
  string,
  void,
  { state: RootState; rejectValue: { status: PageStatus; hint: string | null } }
>('whatsappTemplates/save', async (_, { getState, dispatch, rejectWithValue }) => {
  const screen = getState().whatsappTemplates;
  const selected = screen.templates.find((row) => row.uniqueName === screen.selectedName);
  if (!selected) {
    return rejectWithValue({ status: 'empty', hint: null });
  }
  if (!slotsFilled(screen.values, selected.tenantSlots)) {
    return rejectWithValue({ status: 'validation', hint: null });
  }
  try {
    await saveWhatsAppVariables(selected.uniqueName, screen.values, selected.version);
    await dispatch(loadWhatsappTemplates(selected.uniqueName));
    return 'WhatsApp slots saved for this pharmacy.';
  } catch (error) {
    if (isApiError(error)) {
      return rejectWithValue({ status: mapApiStatus(error), hint: apiStatusHint(error.code) });
    }
    return rejectWithValue({
      status: 'failure',
      hint: 'Could not save WhatsApp slots. Check the connection and try again.',
    });
  }
});
