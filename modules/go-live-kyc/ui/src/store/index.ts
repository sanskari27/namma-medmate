import { configureStore, type EnhancedStore } from '@reduxjs/toolkit';
import { goLiveKycApi, type GoLiveKycApiContext } from './api/go-live-kyc-api.ts';

export function createGoLiveKycStore(extra: GoLiveKycApiContext): EnhancedStore {
  return configureStore({
    reducer: {
      [goLiveKycApi.reducerPath]: goLiveKycApi.reducer,
    },
    middleware: (
      getDefaultMiddleware: (options?: { thunk: { extraArgument: GoLiveKycApiContext } }) => {
        concat: (middleware: unknown) => unknown;
      },
    ) =>
      getDefaultMiddleware({
        thunk: { extraArgument: extra },
      }).concat(goLiveKycApi.middleware),
  } as never);
}

export type GoLiveKycStore = ReturnType<typeof createGoLiveKycStore>;
export type GoLiveKycRootState = ReturnType<GoLiveKycStore['getState']>;
