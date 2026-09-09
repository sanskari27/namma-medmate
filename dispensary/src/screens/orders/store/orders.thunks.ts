import { createAsyncThunk } from '@reduxjs/toolkit';
import { isApiError } from '@/services/axios';
import { emailInvoiceCopy } from '@/services/salesInvoices';
import { listSalesOrders, type SalesOrderRow } from '@/services/salesOrders';
import { ORDERS_CONTENT } from '../OrdersScreen.content';

type Reject = { code?: string; message: string };

export const loadOrders = createAsyncThunk<
  { items: SalesOrderRow[] },
  void,
  { rejectValue: Reject }
>('orders/load', async (_, { rejectWithValue }) => {
  try {
    const data = await listSalesOrders();
    return { items: data.items };
  } catch (error) {
    if (isApiError(error)) {
      return rejectWithValue({
        code: error.code,
        message: error.message || ORDERS_CONTENT.loadFailed,
      });
    }
    return rejectWithValue({ message: ORDERS_CONTENT.loadFailed });
  }
});

export const shareOrderBill = createAsyncThunk<string, string, { rejectValue: string }>(
  'orders/share',
  async (id, { rejectWithValue }) => {
    try {
      await emailInvoiceCopy(id);
      return ORDERS_CONTENT.shareOk;
    } catch (error) {
      if (isApiError(error)) {
        return rejectWithValue(error.message || ORDERS_CONTENT.shareFail);
      }
      return rejectWithValue(ORDERS_CONTENT.shareFail);
    }
  },
);
