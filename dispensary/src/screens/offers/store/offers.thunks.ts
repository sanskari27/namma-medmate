import { createAsyncThunk } from '@reduxjs/toolkit';
import { isApiError } from '@/services/axios';
import {
  createOffer,
  deactivateOffer,
  deleteOffer,
  listOffers,
  publishOffer,
  updateOffer,
  type OfferInput,
  type SalesOffer,
} from '@/services/offers';
import { listProducts, type Product } from '@/services/products';
import { OFFERS_CONTENT } from '../OffersScreen.content';
import { apiStatusHint, mapApiStatus, type PageStatus } from '../OffersScreen.utils';
import type { RootState } from '@/store';

type Reject = { message: string; status?: PageStatus };

export const loadOffers = createAsyncThunk<
  { items: SalesOffer[]; products: Product[] },
  void,
  { rejectValue: Reject }
>('offers/load', async (_, { rejectWithValue }) => {
  try {
    const [offers, products] = await Promise.all([
      listOffers(),
      listProducts().catch(() => [] as Product[]),
    ]);
    return { items: offers.items, products };
  } catch (error) {
    if (isApiError(error)) {
      return rejectWithValue({
        message: error.message || OFFERS_CONTENT.loadFailed,
        status: mapApiStatus(error),
      });
    }
    return rejectWithValue({ message: OFFERS_CONTENT.loadFailed, status: 'failure' });
  }
});

export const saveOffer = createAsyncThunk<
  SalesOffer,
  { input: OfferInput; id?: string; launch?: boolean },
  { rejectValue: Reject }
>('offers/save', async ({ input, id, launch }, { rejectWithValue }) => {
  try {
    const saved = id ? await updateOffer(id, input) : await createOffer(input);
    if (launch && saved.status !== 'ACTIVE') {
      return await publishOffer(saved.id, { expectedVersion: saved.version });
    }
    return saved;
  } catch (error) {
    if (isApiError(error)) {
      return rejectWithValue({
        message: apiStatusHint(error.code) || error.message || OFFERS_CONTENT.status.failure,
        status: mapApiStatus(error),
      });
    }
    return rejectWithValue({ message: OFFERS_CONTENT.status.failure, status: 'failure' });
  }
});

export const toggleOffer = createAsyncThunk<
  SalesOffer,
  string,
  { state: RootState; rejectValue: Reject }
>('offers/toggle', async (id, { getState, rejectWithValue }) => {
  const row = getState().offers.items.find((item) => item.id === id);
  if (!row) {
    return rejectWithValue({ message: OFFERS_CONTENT.status.failure, status: 'failure' });
  }
  try {
    if (row.status === 'ACTIVE') {
      return await deactivateOffer(id, { expectedVersion: row.version });
    }
    return await publishOffer(id, { expectedVersion: row.version });
  } catch (error) {
    if (isApiError(error)) {
      return rejectWithValue({
        message: apiStatusHint(error.code) || error.message || OFFERS_CONTENT.status.failure,
        status: mapApiStatus(error),
      });
    }
    return rejectWithValue({ message: OFFERS_CONTENT.status.failure, status: 'failure' });
  }
});

export const removeOffer = createAsyncThunk<
  string,
  string,
  { state: RootState; rejectValue: Reject }
>('offers/remove', async (id, { getState, rejectWithValue }) => {
  const row = getState().offers.items.find((item) => item.id === id);
  if (!row) {
    return rejectWithValue({ message: OFFERS_CONTENT.status.failure, status: 'failure' });
  }
  try {
    await deleteOffer(id, { expectedVersion: row.version });
    return id;
  } catch (error) {
    if (isApiError(error)) {
      return rejectWithValue({
        message: apiStatusHint(error.code) || error.message || OFFERS_CONTENT.status.failure,
        status: mapApiStatus(error),
      });
    }
    return rejectWithValue({ message: OFFERS_CONTENT.status.failure, status: 'failure' });
  }
});
