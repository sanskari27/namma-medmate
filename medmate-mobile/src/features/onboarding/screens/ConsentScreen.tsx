import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { routes } from '@/navigation/routes';
import {
  ChevronRightIcon,
  FileTextIcon,
  ShieldCheckIcon,
  StarIcon,
} from '@/components/icons';
import { BrandMark, Button, Checkbox, Hero, Text } from '@/components/ui';
import { colors, fontFamily, overlays } from '@/theme';

import { CONSENT } from '../constants';

/**
 * 04 · Terms and consent — "Plain-language summary of what we use and why.
 * Nothing optional gets ticked. Button stays disabled until the age box is
 * ticked." (Figma UX note)
 *
 * Geometry measured off the live MVP at 390×844
 * (see _ref/mvp/dom_consent.json).
 */
export function ConsentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [ageChecked, setAgeChecked] = useState(false);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Hero height={CONSENT.heroHeight + insets.top}>
          <BrandMark
            size={CONSENT.brandSize}
            tracking={CONSENT.brandTracking}
            style={[styles.brand, { top: insets.top + CONSENT.brandTop }]}
          />

          <View style={[styles.shieldWrap, { top: insets.top + CONSENT.shieldWrap.top }]}>
            <ShieldCheckIcon size={26} color={colors.gold} />
          </View>

          <Text
            variant="hero"
            tone="inverse"
            align="center"
            style={[styles.title, { top: insets.top + CONSENT.titleTop }]}
          >
            Terms and <Text tone="gold">Conditions</Text>
          </Text>

          <Text
            variant="bodyS"
            tone="mint"
            align="center"
            style={[styles.lede, { top: insets.top + CONSENT.ledeTop }]}
          >
            Here is what you agree to when you use MedMate. You can change these later in
            Account.
          </Text>
        </Hero>

        <View
          style={[
            styles.card,
            { paddingBottom: insets.bottom + CONSENT.card.paddingBottom },
          ]}
        >
          <View style={styles.included}>
            <Text variant="eyebrow" tone="accentDeep" style={styles.includedLabel}>
              INCLUDED IN OUR TERMS
            </Text>

            <View style={styles.item}>
              <View style={styles.itemIcon}>
                <FileTextIcon size={18} color={colors.green700} />
              </View>
              <View style={styles.itemBody}>
                <Text variant="title" tone="primary">
                  Health information
                </Text>
                <Text variant="caption" tone="muted" style={styles.itemText}>
                  We use your prescriptions and medicine names to fill your orders. Never
                  for ads.
                </Text>
              </View>
            </View>

            <View style={styles.item}>
              <View style={styles.itemIcon}>
                <StarIcon size={18} color={colors.green700} />
              </View>
              <View style={styles.itemBody}>
                <Text variant="title" tone="primary">
                  Usage and activity
                </Text>
                <Text variant="caption" tone="muted" style={styles.itemText}>
                  We look at screens opened and searches to improve MedMate. Never sold.
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.agreeBox}>
            <Checkbox
              checked={ageChecked}
              onChange={setAgeChecked}
              label="I am 18 years or older."
              accessibilityLabel="I am 18 years or older"
            />

            <Text variant="caption" tone="muted" style={styles.legal}>
              By tapping Agree and continue you accept our{' '}
              <Text variant="caption" tone="accent" style={styles.link}>
                Terms and Conditions
              </Text>
              , including the use of your health information and usage data described
              there, and confirm you have read our{' '}
              <Text variant="caption" tone="accent" style={styles.link}>
                Privacy Policy
              </Text>
              .
            </Text>
          </View>

          <Button
            label="Agree and continue"
            disabled={!ageChecked}
            onPress={() => router.push(routes.location)}
            style={styles.agree}
            trailing={
              <ChevronRightIcon
                size={16}
                color={ageChecked ? colors.white : colors.muted}
              />
            }
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  scrollContent: { flexGrow: 1 },

  brand: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  shieldWrap: {
    position: 'absolute',
    alignSelf: 'center',
    width: CONSENT.shieldWrap.size,
    height: CONSENT.shieldWrap.size,
    borderRadius: 999,
    backgroundColor: overlays.white07,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  lede: {
    position: 'absolute',
    left: CONSENT.ledeHorizontalInset,
    right: CONSENT.ledeHorizontalInset,
  },

  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: CONSENT.card.radius,
    borderTopRightRadius: CONSENT.card.radius,
    paddingHorizontal: CONSENT.horizontalPadding,
    paddingTop: CONSENT.card.paddingTop,
  },

  included: {
    borderRadius: CONSENT.included.radius,
    borderWidth: 1,
    borderColor: colors.mint200,
    paddingHorizontal: CONSENT.included.paddingHorizontal,
    paddingTop: CONSENT.included.paddingTop,
    paddingBottom: CONSENT.included.paddingBottom,
  },
  includedLabel: { marginBottom: CONSENT.included.labelMarginBottom },
  item: {
    flexDirection: 'row',
    gap: CONSENT.included.itemGap,
    marginBottom: CONSENT.included.itemMarginBottom,
  },
  itemIcon: {
    width: CONSENT.included.iconSize,
    height: CONSENT.included.iconSize,
    borderRadius: CONSENT.included.iconRadius,
    backgroundColor: colors.mint50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBody: { flex: 1 },
  itemText: { marginTop: 1 },

  agreeBox: {
    backgroundColor: colors.mint50,
    borderRadius: CONSENT.agreeBox.radius,
    paddingHorizontal: CONSENT.agreeBox.paddingHorizontal,
    paddingTop: CONSENT.agreeBox.paddingTop,
    paddingBottom: CONSENT.agreeBox.paddingBottom,
    marginTop: CONSENT.agreeBox.marginTop,
  },
  legal: { marginTop: CONSENT.legalMarginTop },
  link: {
    fontFamily: fontFamily.bold,
    textDecorationLine: 'underline',
  },

  agree: { marginTop: CONSENT.agreeMarginTop },
});
