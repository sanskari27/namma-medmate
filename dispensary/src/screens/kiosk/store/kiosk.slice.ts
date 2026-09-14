import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { InventoryOverviewRow } from '@/services/inventory';
import type {
  KioskAccentTheme,
  KioskConfig,
  KioskPaymentMethod,
  KioskState,
} from '@/services/kiosk';
import {
  defaultConfig,
  type CartLine,
  type PageStatus,
  toCartLine,
} from '../KioskScreen.utils';
import {
  cancelTicket,
  closeSession,
  loadKiosk,
  openSession,
  placeOrder,
  persistConfig,
} from './kiosk.thunks';

export type KioskScreenState = {
  status: PageStatus;
  statusHint: string | null;
  busy: boolean;
  configBusy: boolean;
  kiosk: KioskState | null;
  configDraft: KioskConfig;
  catalogue: InventoryOverviewRow[];
  customerMode: boolean;
  searchQuery: string;
  category: string;
  cart: CartLine[];
  paymentMethod: KioskPaymentMethod;
  lastToken: number | null;
  orderSuccess: boolean;
  rxFileName: string | null;
  pinPromptOpen: boolean;
  pinInput: string;
};

export const initialKioskScreenState: KioskScreenState = {
  status: 'loading',
  statusHint: null,
  busy: false,
  configBusy: false,
  kiosk: null,
  configDraft: defaultConfig(),
  catalogue: [],
  customerMode: false,
  searchQuery: '',
  category: 'All',
  cart: [],
  paymentMethod: 'UPI',
  lastToken: null,
  orderSuccess: false,
  rxFileName: null,
  pinPromptOpen: false,
  pinInput: '',
};

function applyKiosk(state: KioskScreenState, next: KioskState) {
  state.kiosk = next;
  state.configDraft = { ...next.config };
  const payments: KioskPaymentMethod[] = [];
  if (next.config.acceptUpi) payments.push('UPI');
  if (next.config.acceptCard) payments.push('CARD');
  if (next.config.acceptCash) payments.push('CASH');
  if (next.config.acceptCod) payments.push('COD');
  if (payments.length > 0 && !payments.includes(state.paymentMethod)) {
    state.paymentMethod = payments[0];
  }
}

const kioskSlice = createSlice({
  name: 'kiosk',
  initialState: initialKioskScreenState,
  reducers: {
    patchConfigDraft(state, action: PayloadAction<Partial<KioskConfig>>) {
      state.configDraft = { ...state.configDraft, ...action.payload };
    },
    setAccentTheme(state, action: PayloadAction<KioskAccentTheme>) {
      state.configDraft.accentTheme = action.payload;
    },
    setCustomerMode(state, action: PayloadAction<boolean>) {
      state.customerMode = action.payload;
      if (!action.payload) {
        state.orderSuccess = false;
        state.pinPromptOpen = false;
        state.pinInput = '';
      }
    },
    setSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
    },
    setCategory(state, action: PayloadAction<string>) {
      state.category = action.payload;
    },
    setPaymentMethod(state, action: PayloadAction<KioskPaymentMethod>) {
      state.paymentMethod = action.payload;
    },
    addToCart(
      state,
      action: PayloadAction<{ row: InventoryOverviewRow; loose?: boolean }>,
    ) {
      const { row, loose = false } = action.payload;
      const key = `${row.productId}:${loose ? 'loose' : 'pack'}`;
      const existing = state.cart.find(
        (line) => `${line.productId}:${line.loose ? 'loose' : 'pack'}` === key,
      );
      if (existing) {
        existing.quantity += 1;
        return;
      }
      state.cart.push(toCartLine(row, loose));
      state.orderSuccess = false;
      state.status = state.status === 'validation' ? null : state.status;
    },
    changeQty(state, action: PayloadAction<{ productId: string; loose: boolean; delta: number }>) {
      const { productId, loose, delta } = action.payload;
      const line = state.cart.find(
        (row) => row.productId === productId && row.loose === loose,
      );
      if (!line) return;
      line.quantity += delta;
      if (line.quantity <= 0) {
        state.cart = state.cart.filter(
          (row) => !(row.productId === productId && row.loose === loose),
        );
      }
    },
    clearCart(state) {
      state.cart = [];
      state.orderSuccess = false;
      state.lastToken = null;
      state.rxFileName = null;
    },
    setRxFileName(state, action: PayloadAction<string | null>) {
      state.rxFileName = action.payload;
    },
    openPinPrompt(state) {
      state.pinPromptOpen = true;
      state.pinInput = '';
    },
    closePinPrompt(state) {
      state.pinPromptOpen = false;
      state.pinInput = '';
    },
    setPinInput(state, action: PayloadAction<string>) {
      state.pinInput = action.payload;
    },
    markValidation(state) {
      state.status = 'validation';
    },
    clearStatus(state) {
      state.status = null;
      state.statusHint = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadKiosk.pending, (state) => {
        state.status = 'loading';
        state.busy = true;
      })
      .addCase(loadKiosk.fulfilled, (state, action) => {
        state.busy = false;
        applyKiosk(state, action.payload.kiosk);
        state.catalogue = action.payload.catalogue;
        state.status = action.payload.status;
        if (action.payload.kiosk.session?.status === 'OPEN') {
          state.customerMode = false;
        }
      })
      .addCase(loadKiosk.rejected, (state, action) => {
        state.busy = false;
        state.status = action.payload?.status ?? 'failure';
        state.statusHint = action.payload?.message ?? null;
      })
      .addCase(openSession.pending, (state) => {
        state.busy = true;
      })
      .addCase(openSession.fulfilled, (state, action) => {
        state.busy = false;
        applyKiosk(state, action.payload);
        state.status = null;
        state.customerMode = true;
        state.cart = [];
        state.orderSuccess = false;
        state.lastToken = null;
      })
      .addCase(openSession.rejected, (state, action) => {
        state.busy = false;
        state.status = action.payload?.status ?? 'failure';
        state.statusHint = action.payload?.message ?? null;
      })
      .addCase(closeSession.pending, (state) => {
        state.busy = true;
      })
      .addCase(closeSession.fulfilled, (state, action) => {
        state.busy = false;
        applyKiosk(state, action.payload);
        state.status = null;
        state.customerMode = false;
        state.cart = [];
        state.orderSuccess = false;
        state.lastToken = null;
        state.pinPromptOpen = false;
      })
      .addCase(closeSession.rejected, (state, action) => {
        state.busy = false;
        state.status = action.payload?.status ?? 'failure';
        state.statusHint = action.payload?.message ?? null;
      })
      .addCase(persistConfig.pending, (state) => {
        state.configBusy = true;
      })
      .addCase(persistConfig.fulfilled, (state, action) => {
        state.configBusy = false;
        applyKiosk(state, action.payload);
        state.status = 'success';
        state.statusHint = 'Kiosk configuration saved.';
      })
      .addCase(persistConfig.rejected, (state, action) => {
        state.configBusy = false;
        state.status = action.payload?.status ?? 'failure';
        state.statusHint = action.payload?.message ?? null;
      })
      .addCase(placeOrder.pending, (state) => {
        state.busy = true;
      })
      .addCase(placeOrder.fulfilled, (state, action) => {
        state.busy = false;
        applyKiosk(state, action.payload.kiosk);
        state.lastToken = action.payload.token;
        state.orderSuccess = true;
        state.cart = [];
        state.rxFileName = null;
        state.status = 'success';
      })
      .addCase(placeOrder.rejected, (state, action) => {
        state.busy = false;
        state.status = action.payload?.status ?? 'failure';
        state.statusHint = action.payload?.message ?? null;
      })
      .addCase(cancelTicket.pending, (state) => {
        state.busy = true;
      })
      .addCase(cancelTicket.fulfilled, (state, action) => {
        state.busy = false;
        applyKiosk(state, action.payload);
        state.status = null;
      })
      .addCase(cancelTicket.rejected, (state, action) => {
        state.busy = false;
        state.status = action.payload?.status ?? 'failure';
        state.statusHint = action.payload?.message ?? null;
      });
  },
});

export const {
  patchConfigDraft,
  setAccentTheme,
  setCustomerMode,
  setSearchQuery,
  setCategory,
  setPaymentMethod,
  addToCart,
  changeQty,
  clearCart,
  setRxFileName,
  openPinPrompt,
  closePinPrompt,
  setPinInput,
  markValidation,
  clearStatus,
} = kioskSlice.actions;

export const kioskReducer = kioskSlice.reducer;
