import { createAsyncThunk } from '@reduxjs/toolkit';
import { getInventoryOverview, type InventoryOverviewRow } from '@/services/inventory';
import { listProducts } from '@/services/products';
import {
  cancelKioskTicket,
  closeKiosk,
  createKioskTicket,
  getKiosk,
  isApiError,
  openKiosk,
  saveKioskConfig,
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

function productsAsCatalogueRows(
  products: Awaited<ReturnType<typeof listProducts>>,
): InventoryOverviewRow[] {
  return products
    .filter((p) => p.isActive)
    .map((p) => ({
      productId: p.id,
      sku: p.sku,
      name: p.name,
      genericName: p.genericName,
      brandName: p.brandName,
      manufacturerName: null,
      categoryId: p.categoryId,
      categoryName: null,
      categoryIcon: p.categoryIcon,
      scheduleClassification: p.scheduleClassification,
      prescriptionRequired: p.prescriptionRequired,
      rackLocation: p.rackLocation,
      baseUnit: p.baseUnit,
      packUnit: p.packUnit,
      packSize: p.packSize,
      batchCount: 0,
      earliestExpiry: null,
      expired: false,
      nearExpiry: false,
      onHandQuantity: 1,
      lowStock: false,
      outOfStock: false,
      mrpPaise: null,
      costValuePaise: 0,
      retailValuePaise: 0,
      looseUnitPaise: null,
      looseSellingEnabled: false,
      onlineListed: true,
      unallocated: false,
      deadStock: false,
    }));
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
    let catalogue = catalogueForKiosk(overview.items ?? []);
    if (catalogue.length === 0) {
      const products = await listProducts().catch(() => []);
      catalogue = productsAsCatalogueRows(products);
    }
    return {
      kiosk,
      catalogue,
      status: mapBlockReason(kiosk),
    };
  } catch (error) {
    if (isApiError(error)) {
      return rejectWithValue({
        message: error.message || KIOSK_CONTENT.loadFailed,
        status: mapApiStatus(error),
      });
    }
    return rejectWithValue({ message: KIOSK_CONTENT.loadFailed, status: 'failure' });
  }
});

export const openSession = createAsyncThunk<KioskState, void, { rejectValue: Reject }>(
  'kiosk/open',
  async (_, { rejectWithValue }) => {
    try {
      return await openKiosk();
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

export const closeSession = createAsyncThunk<KioskState, void, { rejectValue: Reject }>(
  'kiosk/close',
  async (_, { rejectWithValue }) => {
    try {
      return await closeKiosk();
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
  { rejectValue: Reject }
>('kiosk/placeOrder', async ({ cart, paymentMethod, walkInName }, { rejectWithValue }) => {
  try {
    const kiosk = await createKioskTicket({
      walkInName,
      paymentMethod,
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
