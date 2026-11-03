import { StyleSheet, Text as RNText, type StyleProp, type TextStyle } from 'react-native';

import { colors, fontFamily } from '@/theme';

export interface BrandMarkProps {
  /** Font size in px. */
  size?: number;
  /** Letter spacing in px. Defaults to -3.5% of the size, as in the MVP. */
  tracking?: number;
  style?: StyleProp<TextStyle>;
}

/**
 * The "MedMate" wordmark — Med in white, Mate in gold.
 *
 * This is a logotype, so it deliberately ignores the app font scale: a
 * wordmark that changes size between devices stops being a wordmark.
 */
export function BrandMark({ size = 36, tracking, style }: BrandMarkProps) {
  const letterSpacing = tracking ?? size * -0.035;

  return (
    <RNText
      allowFontScaling={false}
      style={[
        styles.brand,
        { fontSize: size, lineHeight: size * 1.25, letterSpacing },
        style,
      ]}
    >
      <RNText style={styles.med}>Med</RNText>
      <RNText style={styles.mate}>Mate</RNText>
    </RNText>
  );
}

const styles = StyleSheet.create({
  brand: { fontFamily: fontFamily.bold, fontWeight: '700' },
  med: { color: colors.white },
  mate: { color: colors.gold },
});
