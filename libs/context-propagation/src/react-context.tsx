import { createContext, useContext, type ReactNode } from 'react';

export interface ClientRequestContext {
  requestId: string;
  correlationId: string;
}

const ClientContext = createContext<ClientRequestContext | undefined>(undefined);

export function RequestContextProvider({
  value,
  children,
}: {
  value: ClientRequestContext;
  children: ReactNode;
}) {
  return <ClientContext.Provider value={value}>{children}</ClientContext.Provider>;
}

export function useRequestContext(): ClientRequestContext {
  const value = useContext(ClientContext);
  if (!value) {
    throw new Error('useRequestContext must be used within RequestContextProvider');
  }
  return value;
}
