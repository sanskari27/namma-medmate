import { createAsyncThunk } from '@reduxjs/toolkit';
import { isApiError } from '@/services/axios';
import {
  listOutstandingCreditAccounts,
  type CreditDirectory,
} from '@/services/credit';
import { CREDIT_CONTENT } from '../CreditScreen.content';

type Reject = { code?: string; status?: number; message: string };

export const loadCreditDirectory = createAsyncThunk<
  CreditDirectory,
  void,
  { rejectValue: Reject }
>('credit/loadDirectory', async (_, { rejectWithValue }) => {
  try {
    return await listOutstandingCreditAccounts();
  } catch (error) {
    if (isApiError(error)) {
      return rejectWithValue({
        code: error.code ?? undefined,
        status: error.status,
        message: error.message || CREDIT_CONTENT.loadFailed,
      });
    }
    return rejectWithValue({ message: CREDIT_CONTENT.loadFailed });
  }
});
