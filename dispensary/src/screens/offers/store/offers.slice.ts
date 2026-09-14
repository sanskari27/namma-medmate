import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Product } from '@/services/products';
import type { SalesOffer } from '@/services/offers';
import { OFFERS_CONTENT } from '../OffersScreen.content';
import {
  emptyForm,
  toForm,
  type FormState,
  type PageStatus,
} from '../OffersScreen.utils';
import { loadOffers, removeOffer, saveOffer, toggleOffer } from './offers.thunks';

export type OffersState = {
  status: PageStatus;
  statusHint: string | null;
  items: SalesOffer[];
  products: Product[];
  formOpen: boolean;
  formBusy: boolean;
  form: FormState;
  editingId: string | null;
  togglingId: string | null;
};

export const initialOffersState: OffersState = {
  status: 'idle',
  statusHint: null,
  items: [],
  products: [],
  formOpen: false,
  formBusy: false,
  form: emptyForm(),
  editingId: null,
  togglingId: null,
};

const offersSlice = createSlice({
  name: 'offers',
  initialState: initialOffersState,
  reducers: {
    openCreateOffer(state) {
      state.formOpen = true;
      state.editingId = null;
      state.form = emptyForm();
      state.statusHint = null;
    },
    openEditOffer(state, action: PayloadAction<SalesOffer>) {
      state.formOpen = true;
      state.editingId = action.payload.id;
      state.form = toForm(action.payload);
      state.statusHint = null;
    },
    closeOfferForm(state) {
      state.formOpen = false;
      state.editingId = null;
      state.form = emptyForm();
      state.formBusy = false;
    },
    patchOfferForm(state, action: PayloadAction<Partial<FormState>>) {
      state.form = { ...state.form, ...action.payload };
    },
    toggleOfferProduct(state, action: PayloadAction<string>) {
      const id = action.payload;
      const has = state.form.productIds.includes(id);
      state.form.productIds = has
        ? state.form.productIds.filter((row) => row !== id)
        : [...state.form.productIds, id];
    },
    markOffersValidation(state) {
      state.status = 'validation';
      state.statusHint = OFFERS_CONTENT.status.validation;
    },
    clearOffersStatus(state) {
      state.status = state.items.length === 0 ? 'empty' : null;
      state.statusHint = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadOffers.pending, (state) => {
        state.status = 'loading';
        state.statusHint = null;
      })
      .addCase(loadOffers.fulfilled, (state, action) => {
        state.items = action.payload.items;
        state.products = action.payload.products;
        state.status = action.payload.items.length === 0 ? 'empty' : null;
      })
      .addCase(loadOffers.rejected, (state, action) => {
        state.status = action.payload?.status ?? 'failure';
        state.statusHint = action.payload?.message ?? OFFERS_CONTENT.loadFailed;
      })
      .addCase(saveOffer.pending, (state) => {
        state.formBusy = true;
        state.statusHint = null;
      })
      .addCase(saveOffer.fulfilled, (state, action) => {
        const saved = action.payload;
        const rest = state.items.filter((row) => row.id !== saved.id);
        state.items = [...rest, saved].sort(
          (a, b) => b.priority - a.priority || a.name.localeCompare(b.name),
        );
        state.formBusy = false;
        state.formOpen = false;
        state.editingId = null;
        state.form = emptyForm();
        state.status = 'success';
        state.statusHint =
          saved.status === 'ACTIVE'
            ? `${saved.name} is live on this counter.`
            : 'Scheme saved as a draft on this counter.';
      })
      .addCase(saveOffer.rejected, (state, action) => {
        state.formBusy = false;
        state.status = action.payload?.status ?? 'failure';
        state.statusHint = action.payload?.message ?? OFFERS_CONTENT.status.failure;
      })
      .addCase(toggleOffer.pending, (state, action) => {
        state.togglingId = action.meta.arg;
      })
      .addCase(toggleOffer.fulfilled, (state, action) => {
        state.togglingId = null;
        state.items = state.items.map((row) =>
          row.id === action.payload.id ? action.payload : row,
        );
        state.status = null;
        state.statusHint =
          action.payload.status === 'ACTIVE'
            ? `${action.payload.name} is running.`
            : `${action.payload.name} is paused.`;
      })
      .addCase(toggleOffer.rejected, (state, action) => {
        state.togglingId = null;
        state.status = action.payload?.status ?? 'failure';
        state.statusHint = action.payload?.message ?? OFFERS_CONTENT.status.failure;
      })
      .addCase(removeOffer.pending, (state, action) => {
        state.togglingId = action.meta.arg;
      })
      .addCase(removeOffer.fulfilled, (state, action) => {
        state.togglingId = null;
        state.items = state.items.filter((row) => row.id !== action.payload);
        state.status = state.items.length === 0 ? 'empty' : 'success';
        state.statusHint = 'Offer deleted.';
      })
      .addCase(removeOffer.rejected, (state, action) => {
        state.togglingId = null;
        state.status = action.payload?.status ?? 'failure';
        state.statusHint = action.payload?.message ?? OFFERS_CONTENT.status.failure;
      });
  },
});

export const {
  openCreateOffer,
  openEditOffer,
  closeOfferForm,
  patchOfferForm,
  toggleOfferProduct,
  markOffersValidation,
  clearOffersStatus,
} = offersSlice.actions;

export const offersReducer = offersSlice.reducer;
