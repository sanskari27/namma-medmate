import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radius, spacing } from '@/theme';

import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

const HEIGHTS: Record<ButtonSize, number> = { sm: 40, md: 52, lg: 56 };
const TYPE_VARIANT: Record<ButtonSize, 'btnS' | 'btn'> = {
  sm: 'btnS',
  md: 'btn',
  lg: 'btn',
};

/**
 * The app's action button.
 *
 * `minHeight` (not `height`) is deliberate: at larger text sizes the label
 * grows and the button grows with it instead of clipping its own caption.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  leading,
  trailing,
  style,
  accessibilityLabel,
  testID,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const tone = isDisabled
    ? 'muted'
    : variant === 'primary' || variant === 'danger'
      ? 'inverse'
      : variant === 'ghost'
        ? 'accent'
        : 'primary';

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      accessibilityLabel={accessibilityLabel ?? label}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        { minHeight: HEIGHTS[size], borderRadius: radius.md },
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        variant === 'danger' && styles.danger,
        isDisabled && variant !== 'ghost' && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'ghost' ? colors.green : colors.white}
        />
      ) : (
        leading
      )}

      <Text variant={TYPE_VARIANT[size]} tone={tone}>
        {label}
      </Text>

      {!loading && trailing}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  primary: { backgroundColor: colors.green },
  secondary: { backgroundColor: colors.surface3 },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: colors.red },
  disabled: { backgroundColor: colors.surface3 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
});
