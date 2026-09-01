import { configureStore, type EnhancedStore } from '@reduxjs/toolkit';
import { masterCatalogueApi, type MasterCatalogueApiContext } from './api/master-catalogue-api.ts';

export function createMasterCatalogueStore(extra: MasterCatalogueApiContext): EnhancedStore {
  return configureStore({
    reducer: {
      [masterCatalogueApi.reducerPath]: masterCatalogueApi.reducer,
    },
    middleware: (
      getDefaultMiddleware: (options?: { thunk: { extraArgument: MasterCatalogueApiContext } }) => {
        concat: (middleware: unknown) => unknown;
      },
    ) =>
      getDefaultMiddleware({
        thunk: { extraArgument: extra },
      }).concat(masterCatalogueApi.middleware),
  } as never);
}

export type MasterCatalogueStore = ReturnType<typeof createMasterCatalogueStore>;
export type MasterCatalogueRootState = ReturnType<MasterCatalogueStore['getState']>;
