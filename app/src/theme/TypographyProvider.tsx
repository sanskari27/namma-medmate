import React, { createContext, useContext, useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

import {
  clampSystemFontScale,
  resolveTextScale,
  scaleTypography,
  type Typography,
} from './typography';

export interface TypographyContextValue {
  /** The resolved type scale — already multiplied by `scale`. */
  typography: Typography;
  /** Effective scale applied to the base type scale (1 = as designed). */
  scale: number;
  /** The OS font scale after clamping. */
  systemScale: number;
}

const TypographyContext = createContext<TypographyContextValue | null>(null);

export interface TypographyProviderProps {
  /**
   * The user's in-app text-size preference (Account → Text size).
   * Defaults to 1 (as designed).
   */
  userScale?: number;
  children: React.ReactNode;
}

/**
 * Supplies the resolved type scale to the tree.
 *
 * `allowFontScaling` is disabled on every text node in the app, so this
 * provider is the single place where the font scale is decided.
 */
export function TypographyProvider({ userScale = 1, children }: TypographyProviderProps) {
  const { fontScale } = useWindowDimensions();
  const systemScale = clampSystemFontScale(fontScale);
  const scale = resolveTextScale(userScale, systemScale);

  const value = useMemo<TypographyContextValue>(
    () => ({ typography: scaleTypography(scale), scale, systemScale }),
    [scale, systemScale],
  );

  return (
    <TypographyContext.Provider value={value}>{children}</TypographyContext.Provider>
  );
}

/** Read the resolved type scale. Throws when used outside the provider. */
export function useTypography(): TypographyContextValue {
  const context = useContext(TypographyContext);

  if (!context) {
    throw new Error('useTypography() must be called inside <TypographyProvider>.');
  }

  return context;
}
