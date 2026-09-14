import { createAsyncThunk } from '@reduxjs/toolkit';
import { isApiError } from '@/services/axios';
import {
  listWhatsAppMessages,
  retryWhatsAppMessage,
  type WhatsAppMessage,
  type WhatsAppMessageList,
} from '@/services/whatsappMessages';
import type { RootState } from '@/store';
import { apiStatusHint, mapApiStatus, type PageStatus } from '../WhatsappSendsScreen.utils';

export const loadWhatsappSends = createAsyncThunk<
  WhatsAppMessageList,
  void,
  { state: RootState; rejectValue: PageStatus }
>('whatsappSends/load', async (_, { getState, rejectWithValue }) => {
  try {
    const kind = getState().whatsappSends.kind;
    return await listWhatsAppMessages(kind === 'ALL' ? undefined : { kind });
  } catch (error) {
    return rejectWithValue(isApiError(error) ? mapApiStatus(error) : 'failure');
  }
});

export const retryWhatsappSend = createAsyncThunk<
  { saved: WhatsAppMessage; hint: string },
  void,
  { state: RootState; rejectValue: { status: PageStatus; hint: string | null } }
>('whatsappSends/retry', async (_, { getState, rejectWithValue }) => {
  const selected = getState().whatsappSends.items.find(
    (row) => row.id === getState().whatsappSends.selectedId,
  );
  if (!selected) {
    return rejectWithValue({ status: 'validation', hint: null });
  }
  if (selected.status !== 'FAILED') {
    return rejectWithValue({
      status: 'validation',
      hint: 'Only a failed send can be tried again from this counter.',
    });
  }
  try {
    const saved = await retryWhatsAppMessage(selected.id);
    return {
      saved,
      hint:
        saved.status === 'SENT'
          ? 'This WhatsApp send went out from the counter.'
          : (apiStatusHint(saved.failureCode) ??
            'This send is still failed. Check the number or slots.'),
    };
  } catch (error) {
    return rejectWithValue({
      status: isApiError(error) ? mapApiStatus(error) : 'failure',
      hint: isApiError(error) ? apiStatusHint(error.code) : null,
    });
  }
});
