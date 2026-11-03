import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radius, spacing, type TypographyToken } from '@/theme';

import { Text } from './Text';

export interface CheckboxProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  /** Optional inline label rendered to the right of the box. */
  label?: string;
  labelVariant?: TypographyToken;
  disabled?: boolean;
  /** Box edge length in px. */
  size?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

/** A tick box used for consent and preference confirmations. */
export function Checkbox({
  checked,
  onChange,
  label,
  labelVariant = 'bodyS',
  disabled = false,
  size = 24,
  style,
  accessibilityLabel,
  testID,
}: CheckboxProps) {
  const content = (
    <>
      <View
        style={[
          styles.box,
          { width: size, height: size, borderRadius: Math.min(radius.sm, size * 0.25) },
          checked ? styles.boxChecked : styles.boxUnchecked,
        ]}
      >
        {checked ? (
          <Text variant="title" tone="accentDeep" style={styles.mark}>
            ✓
          </Text>
        ) : null}
      </View>

      {label ? (
        <Text variant={labelVariant} tone="secondary" style={styles.label}>
          {label}
        </Text>
      ) : null}
    </>
  );

  if (!onChange) {
    return <View style={[styles.row, style]}>{content}</View>;
  }

  return (
    <Pressable
      onPress={() => onChange(!checked)}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={accessibilityLabel ?? label}
      testID={testID}
      style={({ pressed }) => [styles.row, pressed && styles.pressed, style]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  box: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxUnchecked: { borderColor: colors.line2, backgroundColor: colors.surface },
  boxChecked: { borderColor: colors.green, backgroundColor: colors.mint100 },
  mark: { lineHeight: 18 },
  label: { flex: 1 },
  pressed: { opacity: 0.85 },
});
