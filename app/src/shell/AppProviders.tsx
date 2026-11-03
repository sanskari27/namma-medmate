import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useTextSizeStore } from '@/preferences';
import { TypographyProvider } from '@/theme';

import { ErrorBoundary } from './ErrorBoundary';

export interface AppProvidersProps {
  children: React.ReactNode;
}

/**
 * Everything the app needs before a screen renders.
 *
 * Order matters: the safe-area provider wraps the tree (screens read insets
 * from it), the error boundary sits inside it so a crash still has a themed
 * surface to draw on, and the typography provider resolves the font scale
 * from the user's in-app preference plus the (clamped) OS setting.
 */
export function AppProviders({ children }: AppProvidersProps) {
  const userScale = useTextSizeStore((state) => state.scale);

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <TypographyProvider userScale={userScale}>
          <StatusBar style="light" />
          {children}
        </TypographyProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
