import { createAsyncThunk } from '@reduxjs/toolkit';
import { isApiError } from '@/services/axios';
import { getSalesInvoice, listSalesInvoices, type SalesInvoice } from '@/services/salesInvoices';
import {
  createSalesReturn,
  listSalesReturns,
  previewSalesReturn,
  type SalesReturn,
  type SalesReturnInput,
  type SalesReturnSummary,
} from '@/services/salesReturns';
import { RETURNS_CONTENT } from '../ReturnsScreen.content';
import {
  apiStatusHint,
  matchCompletedInvoice,
  mapCreateError,
  type CreateStatus,
} from '../ReturnsScreen.utils';
import type { RootState } from '@/store';

type Reject = { code?: string; message: string };
type CreateReject = { status: CreateStatus; message: string };

export const loadReturns = createAsyncThunk<
  { items: SalesReturnSummary[]; completedInvoices: SalesInvoice[] },
  void,
  { rejectValue: Reject }
>('returns/load', async (_, { rejectWithValue }) => {
  try {
    const [returns, invoices] = await Promise.all([
      listSalesReturns(),
      listSalesInvoices({ status: 'COMPLETED' }),
    ]);
    return { items: returns.items, completedInvoices: invoices.items };
  } catch (error) {
    if (isApiError(error)) {
      return rejectWithValue({
        code: error.code ?? undefined,
        message: error.message || RETURNS_CONTENT.loadFailed,
      });
    }
    return rejectWithValue({ message: RETURNS_CONTENT.loadFailed });
  }
});

export const findReturnBill = createAsyncThunk<
  SalesInvoice,
  void,
  { state: RootState; rejectValue: CreateReject }
>('returns/findBill', async (_, { getState, rejectWithValue }) => {
  const { billQuery, completedInvoices } = getState().returns;
  if (!billQuery.trim()) {
    return rejectWithValue({
      status: 'validation',
      message: 'Type a collected bill number first.',
    });
  }
  try {
    const matched = matchCompletedInvoice(completedInvoices, billQuery);
    const next = matched ?? (await getSalesInvoice(billQuery.trim()));
    if (next.status !== 'COMPLETED') {
      return rejectWithValue({
        status: 'validation',
        message: 'Only a collected bill can be returned against.',
      });
    }
    return next;
  } catch (error) {
    if (isApiError(error) && error.status === 404) {
      return rejectWithValue({
        status: 'validation',
        message: 'No collected bill matches that number at this outlet.',
      });
    }
    if (isApiError(error)) {
      return rejectWithValue({
        status: mapCreateError(error),
        message: apiStatusHint(error.code) ?? error.message,
      });
    }
    return rejectWithValue({
      status: 'failure',
      message: RETURNS_CONTENT.status.failure,
    });
  }
});

export const previewReturn = createAsyncThunk<
  SalesReturn,
  SalesReturnInput,
  { rejectValue: CreateReject }
>('returns/preview', async (input, { rejectWithValue }) => {
  try {
    return await previewSalesReturn(input);
  } catch (error) {
    if (isApiError(error)) {
      return rejectWithValue({
        status: mapCreateError(error),
        message: apiStatusHint(error.code) ?? error.message,
      });
    }
    return rejectWithValue({
      status: 'failure',
      message: RETURNS_CONTENT.status.failure,
    });
  }
});

export const createReturn = createAsyncThunk<
  {
    recorded: SalesReturn;
    items: SalesReturnSummary[];
    completedInvoices: SalesInvoice[];
  },
  SalesReturnInput,
  { rejectValue: CreateReject }
>('returns/create', async (input, { rejectWithValue }) => {
  try {
    const recorded = await createSalesReturn({
      ...input,
      idempotencyKey: input.idempotencyKey ?? crypto.randomUUID(),
    });
    const [returns, invoices] = await Promise.all([
      listSalesReturns(),
      listSalesInvoices({ status: 'COMPLETED' }),
    ]);
    return {
      recorded,
      items: returns.items,
      completedInvoices: invoices.items,
    };
  } catch (error) {
    if (isApiError(error)) {
      return rejectWithValue({
        status: mapCreateError(error),
        message: apiStatusHint(error.code) ?? error.message,
      });
    }
    return rejectWithValue({
      status: 'failure',
      message: RETURNS_CONTENT.status.failure,
    });
  }
});
