import { createAsyncThunk } from '@reduxjs/toolkit';
import { isApiError } from '@/services/axios';
import {
  acceptDpdpRequest,
  createDpdpRequest,
  decideDpdpRequest,
  getDpdpMatrix,
  listDpdpRequests,
  type DpdpCategory,
  type DpdpRequest,
} from '@/services/dpdp';
import type { PrivacyStatus } from '../PrivacyDeskScreen.utils';

function mapError(error: unknown): PrivacyStatus {
  if (isApiError(error) && error.code === 'FORBIDDEN') return 'denied';
  if (isApiError(error) && error.code === 'VALIDATION_ERROR') return 'validation';
  if (isApiError(error) && (error.code === 'STALE_STATE' || error.status === 409)) return 'conflict';
  return 'failure';
}

export const loadPrivacyDesk = createAsyncThunk<
  { items: DpdpRequest[]; matrix: DpdpCategory[] },
  void,
  { rejectValue: PrivacyStatus }
>('privacyDesk/load', async (_, { rejectWithValue }) => {
  try {
    const [items, matrix] = await Promise.all([listDpdpRequests(), getDpdpMatrix()]);
    return { items, matrix };
  } catch (error) {
    return rejectWithValue(mapError(error));
  }
});

export const logRequest = createAsyncThunk<
  DpdpRequest,
  Parameters<typeof createDpdpRequest>[0],
  { rejectValue: PrivacyStatus }
>('privacyDesk/log', async (body, { rejectWithValue }) => {
  try {
    return await createDpdpRequest(body);
  } catch (error) {
    return rejectWithValue(mapError(error));
  }
});

export const acceptRequest = createAsyncThunk<
  DpdpRequest,
  { id: string; identityMethod: string },
  { rejectValue: PrivacyStatus }
>('privacyDesk/accept', async ({ id, identityMethod }, { rejectWithValue }) => {
  try {
    return await acceptDpdpRequest(id, identityMethod);
  } catch (error) {
    return rejectWithValue(mapError(error));
  }
});

export const closeRequest = createAsyncThunk<
  DpdpRequest,
  { id: string; decision: string; correction?: Record<string, string> },
  { rejectValue: PrivacyStatus }
>('privacyDesk/close', async ({ id, decision, correction }, { rejectWithValue }) => {
  try {
    return await decideDpdpRequest(id, { decision, correction });
  } catch (error) {
    return rejectWithValue(mapError(error));
  }
});
