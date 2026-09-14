import type { RootState } from '@/store';
import { sortPlans } from '../SubscriptionScreen.utils';

export const selectSubStatus = (state: RootState) => state.subscription.status;
export const selectSubHint = (state: RootState) => state.subscription.statusHint;
export const selectSubPaymentNote = (state: RootState) => state.subscription.paymentNote;
export const selectSubCurrent = (state: RootState) => state.subscription.current;
export const selectSubPlans = (state: RootState) => sortPlans(state.subscription.plans);
export const selectSubPending = (state: RootState) => state.subscription.pendingPlan;
