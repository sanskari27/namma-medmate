import React, { forwardRef } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { colors, fontFamily, radius, spacing, useTypography } from '@/theme';

import { Text } from './Text';

export interface InputProps extends Omit<
  TextInputProps,
  'style' | 'value' | 'onChangeText' | 'placeholderTextColor'
> {
  label?: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  /** Fixed text rendered before the input, e.g. "+91". */
  prefix?: string;
  hint?: string;
  error?: string;
  keyboardType?: KeyboardTypeOptions;
  /** Grows with the text size instead of clipping it. */
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  testID?: string;
}

/**
 * Labelled text field with an optional fixed prefix.
 *
 * `allowFontScaling` is disabled for the same reason as on `<Text>` — the app
 * applies its own scale, and the field must keep its measured height.
 */
export const Input = forwardRef<React.ComponentRef<typeof TextInput>, InputProps>(
  function Input(
    {
      label,
      value,
      onChangeText,
      placeholder,
      prefix,
      hint,
      error,
      keyboardType = 'default',
      style,
      inputStyle,
      testID,
      ...rest
    },
    ref,
  ) {
    const { typography } = useTypography();

    return (
      <View style={style}>
        {label ? (
          <Text variant="caption" tone="secondary" style={styles.label}>
            {label}
          </Text>
        ) : null}

        <View style={[styles.field, error ? styles.fieldError : styles.fieldDefault]}>
          {prefix ? (
            <>
              <Text variant="title" tone="primary">
                {prefix}
              </Text>
              <View style={styles.divider} />
            </>
          ) : null}

          <TextInput
            ref={ref}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.faint}
            keyboardType={keyboardType}
            allowFontScaling={false}
            style={[
              styles.input,
              { fontSize: typography.h3.fontSize, lineHeight: typography.h3.lineHeight },
              inputStyle,
            ]}
            testID={testID}
            {...rest}
          />
        </View>

        {error ? (
          <Text variant="caption" tone="danger" style={styles.hint}>
            {error}
          </Text>
        ) : hint ? (
          <Text variant="caption" tone="muted" style={styles.hint}>
            {hint}
          </Text>
        ) : null}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  label: { marginBottom: 6 },
  field: {
    minHeight: 56,
    borderRadius: radius.lg,
    borderWidth: 1,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 17,
    paddingRight: spacing.lg,
  },
  fieldDefault: {
    borderColor: colors.green,
    // MVP focus ring: mint-200 at 3px
    shadowColor: colors.mint200,
    shadowOpacity: 1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  fieldError: { borderColor: colors.red },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: colors.line2,
    marginLeft: 9,
  },
  input: {
    flex: 1,
    fontFamily: fontFamily.bold,
    color: colors.ink,
    paddingLeft: 15,
    paddingVertical: 0,
  },
  hint: { marginTop: 6 },
});
