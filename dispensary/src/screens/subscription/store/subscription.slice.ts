import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { CurrentSubscription, PlanOffer } from '@/services/subscriptions';
import type { PageStatus } from '../SubscriptionScreen.utils';
import { loadSubscription, switchPlan } from './subscription.thunks';

export type SubscriptionScreenState = {
  status: PageStatus;
  statusHint: string | null;
  paymentNote: string | null;
  current: CurrentSubscription | null;
  plans: PlanOffer[];
  pendingPlan: string | null;
};

export const initialSubscriptionScreenState: SubscriptionScreenState = {
  status: 'loading',
  statusHint: null,
  paymentNote: null,
  current: null,
  plans: [],
  pendingPlan: null,
};

const subscriptionSlice = createSlice({
  name: 'subscription',
  initialState: initialSubscriptionScreenState,
  reducers: {
    accessDenied(state, action: PayloadAction<string>) {
      state.status = 'denied';
      state.statusHint = action.payload;
    },
    statusSet(state, action: PayloadAction<{ status: PageStatus; hint?: string | null }>) {
      state.status = action.payload.status;
      state.statusHint = action.payload.hint ?? null;
    },
    paymentNoted(state, action: PayloadAction<string | null>) {
      state.paymentNote = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadSubscription.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(loadSubscription.fulfilled, (state, action) => {
        state.current = action.payload.current;
        state.plans = action.payload.plans;
        state.status = action.payload.current ? null : 'empty';
      })
      .addCase(loadSubscription.rejected, (state, action) => {
        state.status = action.payload?.status ?? 'failure';
        state.statusHint = action.payload?.hint ?? null;
      })
      .addCase(switchPlan.pending, (state, action) => {
        state.pendingPlan = action.meta.arg;
      })
      .addCase(switchPlan.fulfilled, (state, action) => {
        state.pendingPlan = null;
        if (action.payload.redirect) {
          return;
        }
        if (action.payload.current) {
          state.current = action.payload.current;
          state.status = 'success';
        } else {
          state.status = 'failure';
        }
      })
      .addCase(switchPlan.rejected, (state, action) => {
        state.pendingPlan = null;
        state.status = action.payload?.status ?? 'failure';
        state.statusHint = action.payload?.hint ?? null;
      });
  },
});

export const { accessDenied, statusSet, paymentNoted } = subscriptionSlice.actions;
export const subscriptionReducer = subscriptionSlice.reducer;
