import { configureStore, type EnhancedStore } from '@reduxjs/toolkit';
import { manageUsersApi, type ManageUsersApiContext } from './api/manage-users-api.ts';

export function createManageUsersStore(extra: ManageUsersApiContext): EnhancedStore {
  return configureStore({
    reducer: {
      [manageUsersApi.reducerPath]: manageUsersApi.reducer,
    },
    middleware: (
      getDefaultMiddleware: (options?: { thunk: { extraArgument: ManageUsersApiContext } }) => {
        concat: (middleware: unknown) => unknown;
      },
    ) =>
      getDefaultMiddleware({
        thunk: { extraArgument: extra },
      }).concat(manageUsersApi.middleware),
  } as never);
}

export type ManageUsersStore = ReturnType<typeof createManageUsersStore>;
export type ManageUsersRootState = ReturnType<ManageUsersStore['getState']>;
