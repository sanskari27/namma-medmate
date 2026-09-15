import { createAsyncThunk } from '@reduxjs/toolkit';
import { getInventoryOverview, type InventoryOverviewRow } from '@/services/inventory';
import {
  cancelKioskTicket,
  closeKiosk,
  createKioskTicket,
  getKiosk,
  isApiError,
  openKiosk,
  saveKioskConfig,
  verifyKioskExitPin,
  type KioskConfig,
  type KioskPaymentMethod,
  type KioskState,
} from '@/services/kiosk';
import { KIOSK_CONTENT } from '../KioskScreen.content';
import {
  catalogueForKiosk,
  mapApiStatus,
  mapBlockReason,
  type CartLine,
  type PageStatus,
} from '../KioskScreen.utils';

type Reject = { message: string; status?: PageStatus };

function statusMessage(status: PageStatus | undefined): string | undefined {
  if (!status || status === 'idle' || status === 'success' || status === 'loading') {
    return undefined;
  }
  return KIOSK_CONTENT.status[status];
}

function rejectFrom(error: unknown): Reject {
  if (isApiError(error)) {
    const status = mapApiStatus(error);
    return {
      message: statusMessage(status) || error.message || KIOSK_CONTENT.status.failure,
      status,
    };
  }
  return { message: KIOSK_CONTENT.status.failure, status: 'failure' };
}

export const loadKiosk = createAsyncThunk<
  { kiosk: KioskState; catalogue: InventoryOverviewRow[]; status: PageStatus },
  void,
  { rejectValue: Reject }
>('kiosk/load', async (_, { rejectWithValue }) => {
  try {
    const [kiosk, overview] = await Promise.all([
      getKiosk(),
      getInventoryOverview().catch(() => ({ items: [] as InventoryOverviewRow[] })),
    ]);
    const catalogue = catalogueForKiosk(overview.items ?? []);
    return {
      kiosk,
      catalogue,
      status: mapBlockReason(kiosk),
    };
  } catch (error) {
    return rejectWithValue(rejectFrom(error));
  }
});

export const openSession = createAsyncThunk<KioskState, void, { rejectValue: Reject }>(
  'kiosk/open',
  async (_, { rejectWithValue }) => {
    try {
      return await openKiosk();
    } catch (error) {
      return rejectWithValue(rejectFrom(error));
    }
  },
);

export const closeSession = createAsyncThunk<KioskState, void, { rejectValue: Reject }>(
  'kiosk/close',
  async (_, { rejectWithValue }) => {
    try {
      return await closeKiosk();
    } catch (error) {
      return rejectWithValue(rejectFrom(error));
    }
  },
);

export const persistConfig = createAsyncThunk<
  KioskState,
  KioskConfig,
  { rejectValue: Reject }
>('kiosk/persistConfig', async (config, { rejectWithValue }) => {
  try {
    return await saveKioskConfig(config);
  } catch (error) {
    if (isApiError(error)) {
      return rejectWithValue({
        message: error.message || KIOSK_CONTENT.status.failure,
        status: mapApiStatus(error),
      });
    }
    return rejectWithValue({ message: KIOSK_CONTENT.status.failure, status: 'failure' });
  }
});

export const placeOrder = createAsyncThunk<
  { kiosk: KioskState; token: number },
  { cart: CartLine[]; paymentMethod: KioskPaymentMethod; walkInName?: string },
  { rejectValue: Reject; state: { kiosk: { orderKey: string | null } } }
>('kiosk/placeOrder', async ({ cart, paymentMethod, walkInName }, { getState, rejectWithValue }) => {
  try {
    const key = getState().kiosk.orderKey ?? crypto.randomUUID();
    const kiosk = await createKioskTicket({
      walkInName,
      paymentMethod,
      idempotencyKey: key,
      items: cart.map((line) => ({
        productId: line.productId,
        name: line.name,
        packLabel: line.packLabel,
        quantity: line.quantity,
        unitPricePaise: line.unitPricePaise,
        prescriptionRequired: line.prescriptionRequired,
      })),
    });
    const newest = kiosk.waitingTickets[kiosk.waitingTickets.length - 1];
    return { kiosk, token: newest?.token ?? 0 };
  } catch (error) {
    if (isApiError(error)) {
      return rejectWithValue({
        message: error.message || KIOSK_CONTENT.status.failure,
        status: mapApiStatus(error),
      });
    }
    return rejectWithValue({ message: KIOSK_CONTENT.status.failure, status: 'failure' });
  }
});

export const cancelTicket = createAsyncThunk<KioskState, string, { rejectValue: Reject }>(
  'kiosk/cancelTicket',
  async (ticketId, { rejectWithValue }) => {
    try {
      return await cancelKioskTicket(ticketId);
    } catch (error) {
      if (isApiError(error)) {
        return rejectWithValue({
          message: error.message || KIOSK_CONTENT.status.failure,
          status: mapApiStatus(error),
        });
      }
      return rejectWithValue({ message: KIOSK_CONTENT.status.failure, status: 'failure' });
    }
  },
);

export const verifyExitPin = createAsyncThunk<KioskState, string, { rejectValue: Reject }>(
  'kiosk/verifyExitPin',
  async (staffExitPin, { rejectWithValue }) => {
    try {
      return await verifyKioskExitPin(staffExitPin);
    } catch (error) {
      if (isApiError(error)) {
        return rejectWithValue({
          message: error.message || KIOSK_CONTENT.pinWrong,
          status: mapApiStatus(error),
        });
      }
      return rejectWithValue({ message: KIOSK_CONTENT.pinWrong, status: 'failure' });
    }
  },
);
