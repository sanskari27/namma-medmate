import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ChevronLeftIcon } from '@/components/icons';
import { Text } from '@/components/ui';
import { colors } from '@/theme';

export interface TopBarProps {
  /** Rendered on the left — usually a back button. */
  left?: React.ReactNode;
  /** Rendered on the right — usually icon buttons. */
  right?: React.ReactNode;
  /** Centre slot (the search field on the search screen). */
  center?: React.ReactNode;
  onBack?: () => void;
}

/**
 * The floating icon bar that sits over a coloured header.
 *
 * Every button is a 40px circle (44px square on the search screen) filled
 * with a translucent white, which is what gives the MVP's headers their
 * "floating over the colour" look.
 */
export function TopBar({ left, right, center, onBack }: TopBarProps) {
  return (
    <View style={styles.bar}>
      {left ?? (onBack ? <BackButton onPress={onBack} /> : null)}

      {center ? <View style={styles.center}>{center}</View> : null}

      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

export function BackButton({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      style={({ pressed }) => [styles.circle, pressed && styles.pressed]}
    >
      <ChevronLeftIcon size={20} color={colors.white} />
    </Pressable>
  );
}

export function CircleAction({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.circle, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    minHeight: 40,
  },
  center: { flex: 1, marginHorizontal: 8 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
});

/** The translucent white circle used on coloured headers. */
export function HeaderCircle({
  label,
  onPress,
  children,
  size = 40,
  background = 'rgba(255,255,255,0.10)',
}: {
  label: string;
  onPress?: () => void;
  children: React.ReactNode;
  size?: number;
  background?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: background,
          alignItems: 'center',
          justifyContent: 'center',
        },
        pressed && styles.pressed,
      ]}
    >
      {children}
    </Pressable>
  );
}

/** A round "key" label used as a pharmacy monogram. */
export function Monogram({
  label,
  size,
  radius,
  background = colors.mint100,
  color = colors.green700,
  fontSize = 13,
}: {
  label: string;
  size: number;
  radius: number;
  background?: string;
  color?: string;
  fontSize?: number;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: background,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text variant="title" style={{ fontSize, color }}>
        {label}
      </Text>
    </View>
  );
}
