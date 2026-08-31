import { configureStore, type EnhancedStore } from '@reduxjs/toolkit';
import { authApi, type AuthApiContext } from './api/auth-api.ts';
import { sessionSlice, type SessionState } from './slices/session-slice.ts';

export function createAuthStore(
  extra: AuthApiContext,
  preloadedState?: { session?: SessionState },
): EnhancedStore {
  return configureStore({
    reducer: {
      session: sessionSlice.reducer,
      [authApi.reducerPath]: authApi.reducer,
    },
    middleware: (
      getDefaultMiddleware: (options?: { thunk: { extraArgument: AuthApiContext } }) => {
        concat: (middleware: unknown) => unknown;
      },
    ) =>
      getDefaultMiddleware({
        thunk: { extraArgument: extra },
      }).concat(authApi.middleware),
    preloadedState,
  } as never);
}

export type AuthStore = ReturnType<typeof createAuthStore>;
export type AuthRootState = ReturnType<AuthStore['getState']>;
