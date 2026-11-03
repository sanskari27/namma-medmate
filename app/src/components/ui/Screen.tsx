import React from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors } from '@/theme';

export interface ScreenProps {
  children: React.ReactNode;
  background?: string;
  /** Which safe-area edges to inset. */
  edges?: readonly Edge[];
  style?: StyleProp<ViewStyle>;
}

/**
 * Screen container with safe-area insets applied.
 *
 * The web MVP has no status bar, so every native screen has to add the inset
 * itself — doing it here keeps that rule in one place.
 */
export function Screen({
  children,
  background = colors.surface,
  edges = ['top', 'bottom'],
  style,
}: ScreenProps) {
  return (
    <SafeAreaView
      edges={edges}
      style={[styles.root, { backgroundColor: background }, style]}
    >
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
