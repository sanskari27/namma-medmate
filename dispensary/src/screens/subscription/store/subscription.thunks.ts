import { createAsyncThunk } from '@reduxjs/toolkit';
import { isApiError } from '@/services/axios';
import {
  getCatalogue,
  getCurrentSubscription,
  startCashfreeCheckout,
  upgradePlan,
  type CurrentSubscription,
  type PlanOffer,
} from '@/services/subscriptions';
import type { RootState } from '@/store';
import { isPaidPlan, type PageStatus } from '../SubscriptionScreen.utils';

export type SubReject = { status: PageStatus; hint: string | null };

export const loadSubscription = createAsyncThunk<
  { current: CurrentSubscription; plans: PlanOffer[] },
  void,
  { rejectValue: SubReject }
>('subscription/load', async (_, { rejectWithValue }) => {
  try {
    const [current, plans] = await Promise.all([getCurrentSubscription(), getCatalogue()]);
    return { current, plans };
  } catch (error) {
    if (isApiError(error) && error.status === 403) {
      return rejectWithValue({ status: 'denied', hint: null });
    }
    if (isApiError(error) && (error.status === 404 || error.code === 'PLAN_LIMIT')) {
      return rejectWithValue({ status: 'empty', hint: null });
    }
    return rejectWithValue({ status: 'failure', hint: null });
  }
});

export const switchPlan = createAsyncThunk<
  { current: CurrentSubscription | null; redirect: boolean },
  string,
  { state: RootState; rejectValue: SubReject }
>('subscription/switch', async (planCode, { getState, rejectWithValue }) => {
  const current = getState().subscription.current;
  if (current && planCode === current.planCode) {
    return rejectWithValue({ status: 'validation', hint: null });
  }
  const offer = getState().subscription.plans.find((plan) => plan.planCode === planCode);
  try {
    if (offer && isPaidPlan(offer)) {
      const checkout = await startCashfreeCheckout(planCode, crypto.randomUUID());
      if (checkout.checkoutUrl) {
        window.location.assign(checkout.checkoutUrl);
        return { current: null, redirect: true };
      }
      return rejectWithValue({ status: 'failure', hint: null });
    }
    const next = await upgradePlan(planCode, crypto.randomUUID());
    return { current: next, redirect: false };
  } catch (error) {
    if (isApiError(error)) {
      if (error.status === 403) {
        return rejectWithValue({ status: 'denied', hint: null });
      }
      if (error.status === 409) {
        return rejectWithValue({ status: 'conflict', hint: null });
      }
      if (error.code === 'PLAN_LIMIT') {
        return rejectWithValue({ status: 'quota', hint: null });
      }
      if (error.code === 'PROVIDER_UNAVAILABLE' || error.code === 'PAYMENT_REQUIRED') {
        return rejectWithValue({ status: 'unavailable', hint: null });
      }
      if (error.status === 400 || error.status === 422) {
        return rejectWithValue({ status: 'validation', hint: null });
      }
    }
    return rejectWithValue({ status: 'failure', hint: null });
  }
});
