import { configureStore, type EnhancedStore } from '@reduxjs/toolkit';
import { employeesApi, type EmployeesApiContext } from './api/employees-api.ts';

export function createEmployeesStore(extra: EmployeesApiContext): EnhancedStore {
  return configureStore({
    reducer: {
      [employeesApi.reducerPath]: employeesApi.reducer,
    },
    middleware: (
      getDefaultMiddleware: (options?: { thunk: { extraArgument: EmployeesApiContext } }) => {
        concat: (middleware: unknown) => unknown;
      },
    ) =>
      getDefaultMiddleware({
        thunk: { extraArgument: extra },
      }).concat(employeesApi.middleware),
  } as never);
}

export type EmployeesStore = ReturnType<typeof createEmployeesStore>;
export type EmployeesRootState = ReturnType<EmployeesStore['getState']>;
