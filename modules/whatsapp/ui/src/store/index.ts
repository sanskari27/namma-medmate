import { configureStore, type EnhancedStore } from '@reduxjs/toolkit';
import { whatsappApi, type WhatsAppApiContext } from './api/whatsapp-api.ts';

export function createWhatsAppStore(extra: WhatsAppApiContext): EnhancedStore {
  return configureStore({
    reducer: {
      [whatsappApi.reducerPath]: whatsappApi.reducer,
    },
    middleware: (
      getDefaultMiddleware: (options?: { thunk: { extraArgument: WhatsAppApiContext } }) => {
        concat: (middleware: unknown) => unknown;
      },
    ) =>
      getDefaultMiddleware({
        thunk: { extraArgument: extra },
      }).concat(whatsappApi.middleware),
  } as never);
}

export type WhatsAppStore = ReturnType<typeof createWhatsAppStore>;
export type WhatsAppRootState = ReturnType<WhatsAppStore['getState']>;
