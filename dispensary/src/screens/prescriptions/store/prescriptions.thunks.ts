import { createAsyncThunk } from '@reduxjs/toolkit';
import { isApiError } from '@/services/axios';
import {
  archivePrescriptionReference,
  listPrescriptionReferences,
  scanPrescriptionReferences,
  type PrescriptionReference,
} from '@/services/prescriptionReferences';
import { RX_CONTENT } from '../PrescriptionsScreen.content';
import { apiHint } from '../PrescriptionsScreen.utils';

type Reject = { code?: string; message: string };

export const loadPrescriptions = createAsyncThunk<
  { items: PrescriptionReference[] },
  void,
  { rejectValue: Reject }
>('prescriptions/load', async (_, { rejectWithValue }) => {
  try {
    const data = await listPrescriptionReferences();
    return { items: data.items };
  } catch (error) {
    if (isApiError(error)) {
      return rejectWithValue({
        code: error.code ?? undefined,
        message: error.message || RX_CONTENT.loadFailed,
      });
    }
    return rejectWithValue({ message: RX_CONTENT.loadFailed });
  }
});

export const archivePrescription = createAsyncThunk<
  PrescriptionReference,
  { id: string; version: number },
  { rejectValue: Reject }
>('prescriptions/archive', async ({ id, version }, { rejectWithValue }) => {
  try {
    return await archivePrescriptionReference(id, version);
  } catch (error) {
    if (isApiError(error)) {
      return rejectWithValue({
        code: error.code ?? undefined,
        message: apiHint(error.code) || error.message || RX_CONTENT.status.failure,
      });
    }
    return rejectWithValue({ message: RX_CONTENT.status.failure });
  }
});

export const scanExpiredPrescriptions = createAsyncThunk<
  { archived: number; items: PrescriptionReference[] },
  void,
  { rejectValue: Reject }
>('prescriptions/scan', async (_, { rejectWithValue }) => {
  try {
    const result = await scanPrescriptionReferences();
    const data = await listPrescriptionReferences();
    return { archived: result.archived, items: data.items };
  } catch (error) {
    if (isApiError(error)) {
      return rejectWithValue({
        code: error.code ?? undefined,
        message: apiHint(error.code) || error.message || RX_CONTENT.status.failure,
      });
    }
    return rejectWithValue({ message: RX_CONTENT.status.failure });
  }
});
