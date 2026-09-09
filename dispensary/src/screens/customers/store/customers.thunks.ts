import { createAsyncThunk } from '@reduxjs/toolkit';
import { isApiError } from '@/services/axios';
import { getCustomerCredit, type CustomerCredit } from '@/services/credit';
import {
  getCustomer,
  listCustomerDirectory,
  listCustomerDirectoryPurchases,
  updateCustomer,
  type Customer,
  type CustomerDirectoryItem,
  type CustomerDirectoryPurchase,
  type CustomerInput,
} from '@/services/customers';
import { CUSTOMERS_CONTENT } from '../CustomersScreen.content';
import { WALK_IN_KEY } from '../CustomersScreen.utils';
import type { RootState } from '@/store';

type Reject = { code?: string; message: string };
type SaveReject = { code?: string; message: string; status?: 'validation' | 'conflict' | 'failure' };

export const loadCustomers = createAsyncThunk<
  CustomerDirectoryItem[],
  string | undefined,
  { rejectValue: Reject }
>('customers/load', async (query, { rejectWithValue }) => {
  try {
    return await listCustomerDirectory(query);
  } catch (error) {
    if (isApiError(error)) {
      return rejectWithValue({
        code: error.code ?? undefined,
        message: error.message || CUSTOMERS_CONTENT.loadFailed,
      });
    }
    return rejectWithValue({ message: CUSTOMERS_CONTENT.loadFailed });
  }
});

export const loadCustomerDetail = createAsyncThunk<
  {
    credit: CustomerCredit | null;
    purchases: CustomerDirectoryPurchase[];
    profile: Customer | null;
  },
  string,
  { state: RootState; rejectValue: Reject }
>('customers/loadDetail', async (selectedKey, { getState, rejectWithValue }) => {
  try {
    const row = getState().customers.items.find((item) =>
      item.walkInAggregate ? selectedKey === WALK_IN_KEY : item.id === selectedKey,
    );
    if (!row) {
      return { credit: null, purchases: [], profile: null };
    }
    if (row.walkInAggregate) {
      const purchases = await listCustomerDirectoryPurchases({ walkIn: true });
      return { credit: null, purchases, profile: null };
    }
    const [credit, purchases, profile] = await Promise.all([
      getCustomerCredit(row.id!).catch(() => null),
      listCustomerDirectoryPurchases({ customerId: row.id! }),
      getCustomer(row.id!),
    ]);
    return { credit, purchases, profile };
  } catch (error) {
    if (isApiError(error)) {
      return rejectWithValue({
        code: error.code ?? undefined,
        message: error.message || CUSTOMERS_CONTENT.status.failure,
      });
    }
    return rejectWithValue({ message: CUSTOMERS_CONTENT.status.failure });
  }
});

export const saveCustomerProfile = createAsyncThunk<
  { profile: Customer; items: CustomerDirectoryItem[] },
  CustomerInput,
  { state: RootState; rejectValue: SaveReject }
>('customers/saveProfile', async (input, { getState, rejectWithValue }) => {
  const selected = getState().customers.selectedKey;
  const row = getState().customers.items.find((item) =>
    item.walkInAggregate ? selected === WALK_IN_KEY : item.id === selected,
  );
  if (!row?.id || row.walkInAggregate) {
    return rejectWithValue({
      status: 'validation',
      message: CUSTOMERS_CONTENT.detail.editWalkInBlocked,
    });
  }
  if (!input.name.trim() || !input.phone.trim()) {
    return rejectWithValue({
      status: 'validation',
      message: CUSTOMERS_CONTENT.detail.editValidation,
    });
  }
  try {
    const profile = await updateCustomer(row.id, input);
    const items = await listCustomerDirectory(getState().customers.query || undefined);
    return { profile, items };
  } catch (error) {
    if (isApiError(error) && error.code === 'PHONE_TAKEN') {
      return rejectWithValue({
        status: 'conflict',
        code: error.code,
        message: CUSTOMERS_CONTENT.detail.editConflict,
      });
    }
    if (isApiError(error) && error.status === 400) {
      return rejectWithValue({
        status: 'validation',
        message: CUSTOMERS_CONTENT.detail.editValidation,
      });
    }
    if (isApiError(error)) {
      return rejectWithValue({
        status: 'failure',
        code: error.code ?? undefined,
        message: error.message || CUSTOMERS_CONTENT.status.failure,
      });
    }
    return rejectWithValue({
      status: 'failure',
      message: CUSTOMERS_CONTENT.status.failure,
    });
  }
});
