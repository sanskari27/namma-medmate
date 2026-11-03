import { useMemo, useRef, type ComponentRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors } from '@/theme';

import { OTP } from '../constants';

export interface OtpInputProps {
  value: string;
  onChange: (code: string) => void;
  /** Fired once the last box is filled — used to auto-verify. */
  onComplete?: (code: string) => void;
  length?: number;
}

/**
 * Four large code boxes with a hidden input behind them.
 *
 * Boxes are not real inputs: a single transparent `TextInput` sits on top so
 * the platform keyboard, autofill from the SMS (`oneTimeCode`) and paste all
 * behave exactly as the MVP does.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  length = OTP.codeLength,
}: OtpInputProps) {
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);

  const digits = useMemo(
    () => Array.from({ length }, (_, index) => value[index] ?? ''),
    [value, length],
  );

  const activeIndex = digits.findIndex((digit) => digit === '');

  const handleChange = (text: string) => {
    const next = text.replace(/\D/g, '').slice(0, length);
    onChange(next);

    if (next.length === length) {
      onComplete?.(next);
    }
  };

  return (
    <View>
      <Pressable
        style={styles.boxes}
        onPress={() => inputRef.current?.focus()}
        accessibilityRole="button"
        accessibilityLabel="Enter verification code"
      >
        {digits.map((digit, index) => (
          <View
            key={index}
            style={[
              styles.box,
              index === activeIndex && value.length < length ? styles.boxActive : null,
            ]}
          >
            <Text variant="h1" tone="primary" align="center">
              {digit}
            </Text>
          </View>
        ))}
      </Pressable>

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        maxLength={length}
        style={styles.hiddenInput}
        caretHidden
        allowFontScaling={false}
        autoComplete="sms-otp"
        textContentType="oneTimeCode"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  boxes: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: OTP.boxGap,
  },
  box: {
    width: OTP.boxSize,
    height: OTP.boxHeight,
    borderRadius: OTP.boxRadius,
    borderWidth: 1,
    borderColor: colors.line2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: {
    borderColor: colors.green,
    shadowColor: colors.mint200,
    shadowOpacity: 1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: 1,
    opacity: 0,
  },
});
