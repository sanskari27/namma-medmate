import { configureStore, type EnhancedStore } from '@reduxjs/toolkit';
import { tenancyApi, type TenancyApiContext } from './api/tenancy-api.ts';
import { tenantSlice, type TenantState } from './slices/tenant-slice.ts';

export function createTenancyStore(
  extra: TenancyApiContext,
  preloadedState?: { tenant?: TenantState },
): EnhancedStore {
  return configureStore({
    reducer: {
      tenant: tenantSlice.reducer,
      [tenancyApi.reducerPath]: tenancyApi.reducer,
    },
    middleware: (
      getDefaultMiddleware: (options?: { thunk: { extraArgument: TenancyApiContext } }) => {
        concat: (middleware: unknown) => unknown;
      },
    ) =>
      getDefaultMiddleware({
        thunk: { extraArgument: extra },
      }).concat(tenancyApi.middleware),
    preloadedState,
  } as never);
}

export type TenancyStore = ReturnType<typeof createTenancyStore>;
export type TenancyRootState = ReturnType<TenancyStore['getState']>;
