import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { ChevronRightIcon } from '@/components/icons';
import { Text } from '@/components/ui';
import { colors, gradients } from '@/theme';

import { homePromo } from '../constants';

export interface PromoBannerProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  code: string;
  cta: string;
  /** Photos shown on the right-hand side of the banner. */
  art?: React.ReactNode;
  onCta?: () => void;
  onCode?: () => void;
}

/**
 * The green gradient promo banner under the home quick actions.
 *
 * Everything inside it is measured: 358 × 128 with a 24px radius, a 40px gold
 * headline, a gold call-to-action and a dashed offer-code pill.
 */
export function PromoBanner({
  eyebrow,
  title,
  subtitle,
  code,
  cta,
  art,
  onCta,
  onCode,
}: PromoBannerProps) {
  return (
    <LinearGradient
      colors={[gradients.brand.from, gradients.brand.to]}
      start={gradients.brand.start}
      end={gradients.brand.end}
      style={styles.banner}
    >
      <View style={styles.copy}>
        <Text variant="eyebrow" tone="mint" style={styles.eyebrow}>
          {eyebrow}
        </Text>
        <Text variant="display" tone="gold" style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text variant="bodyS" tone="mint" style={styles.subtitle} numberOfLines={2}>
          {subtitle}
        </Text>

        <View style={styles.actions}>
          <Pressable
            onPress={onCta}
            accessibilityRole="button"
            accessibilityLabel={cta}
            style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
          >
            <Text variant="btnS" tone="primary">
              {cta}
            </Text>
            <ChevronRightIcon size={16} color={colors.forest} />
          </Pressable>

          <Pressable
            onPress={onCode}
            accessibilityRole="button"
            accessibilityLabel={`Apply offer code ${code}`}
            style={({ pressed }) => [styles.code, pressed && styles.pressed]}
          >
            <Text variant="btnS" tone="inverse">
              {code}
            </Text>
          </Pressable>
        </View>
      </View>

      {art ? <View style={styles.art}>{art}</View> : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  banner: {
    height: homePromo.height,
    borderRadius: homePromo.radius,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  // The MVP stacks these exactly: eyebrow at +0, headline at +18, subtitle at
  // +66 and the call-to-action row at +92 — all inside a 128px banner.
  copy: { flex: 1, paddingLeft: 16 },
  eyebrow: { textTransform: 'uppercase' },
  title: { fontSize: homePromo.titleSize, lineHeight: 40, marginTop: 4 },
  subtitle: { marginTop: 8 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    width: homePromo.ctaWidth,
    minHeight: homePromo.ctaHeight,
    backgroundColor: colors.gold,
    borderRadius: homePromo.ctaRadius,
  },
  code: {
    alignItems: 'center',
    justifyContent: 'center',
    width: homePromo.codeWidth,
    minHeight: homePromo.codeHeight,
    borderRadius: homePromo.codeRadius,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.mint,
  },
  pressed: { opacity: 0.85 },
  art: {
    width: homePromo.artWidth,
    height: homePromo.artHeight,
    marginTop: homePromo.artTop,
    marginRight: 0,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
});
