import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from '@/theme';

export type CardVariant = 'surface' | 'tint' | 'outline';

export interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  /** Adds the default inner padding. */
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** A rounded surface used for grouped content. */
export function Card({
  children,
  variant = 'surface',
  padded = false,
  style,
}: CardProps) {
  return (
    <View
      style={[
        styles.base,
        variant === 'surface' && styles.surface,
        variant === 'tint' && styles.tint,
        variant === 'outline' && styles.outline,
        padded && styles.padded,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.lg },
  surface: {
    backgroundColor: colors.surface,
    shadowColor: colors.ink,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  tint: { backgroundColor: colors.mint50 },
  outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.line },
  padded: { padding: spacing.lg },
});
