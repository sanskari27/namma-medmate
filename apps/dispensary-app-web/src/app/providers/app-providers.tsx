import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { ErrorBoundary } from '@namma-medmate/error-handling';
import { dispensaryStore } from '../../store/index.ts';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <Provider store={dispensaryStore}>{children}</Provider>
    </ErrorBoundary>
  );
}
