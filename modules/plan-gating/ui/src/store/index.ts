import { configureStore, type EnhancedStore } from '@reduxjs/toolkit';
import { planGatingApi, type PlanGatingApiContext } from './api/plan-gating-api.ts';
import { entitlementsSlice, type EntitlementsState } from './slices/entitlements-slice.ts';

export function createPlanGatingStore(
  extra: PlanGatingApiContext,
  preloadedState?: { entitlements?: EntitlementsState },
): EnhancedStore {
  return configureStore({
    reducer: {
      entitlements: entitlementsSlice.reducer,
      [planGatingApi.reducerPath]: planGatingApi.reducer,
    },
    middleware: (
      getDefaultMiddleware: (options?: { thunk: { extraArgument: PlanGatingApiContext } }) => {
        concat: (middleware: unknown) => unknown;
      },
    ) =>
      getDefaultMiddleware({
        thunk: { extraArgument: extra },
      }).concat(planGatingApi.middleware),
    preloadedState,
  } as never);
}

export type PlanGatingStore = ReturnType<typeof createPlanGatingStore>;
export type PlanGatingRootState = ReturnType<PlanGatingStore['getState']>;
