import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { gradients } from '@/theme';

export interface HeroProps {
  /** Fixed height in px. Omit to size from the children. */
  height?: number;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** The forest→green wash that tops every onboarding screen. */
export function Hero({ height, children, style }: HeroProps) {
  return (
    <View style={[styles.root, height === undefined ? null : { height }, style]}>
      <LinearGradient
        colors={[gradients.brand.from, gradients.brand.to]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { overflow: 'hidden' },
});
