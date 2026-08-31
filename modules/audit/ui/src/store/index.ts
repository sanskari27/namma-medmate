import { configureStore, type EnhancedStore } from '@reduxjs/toolkit';
import { auditApi, type AuditApiContext } from './api/audit-api.ts';

export function createAuditStore(extra: AuditApiContext): EnhancedStore {
  return configureStore({
    reducer: {
      [auditApi.reducerPath]: auditApi.reducer,
    },
    middleware: (
      getDefaultMiddleware: (options?: { thunk: { extraArgument: AuditApiContext } }) => {
        concat: (middleware: unknown) => unknown;
      },
    ) =>
      getDefaultMiddleware({
        thunk: { extraArgument: extra },
      }).concat(auditApi.middleware),
  } as never);
}

export type AuditStore = ReturnType<typeof createAuditStore>;
export type AuditRootState = ReturnType<AuditStore['getState']>;
