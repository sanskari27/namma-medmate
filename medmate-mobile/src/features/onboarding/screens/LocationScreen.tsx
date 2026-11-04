import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MapPinIcon,
  PlusIcon,
} from '@/components/icons';
import { Button, Hero, Text } from '@/components/ui';
import { useLocationStore } from '@/store';
import { colors, fontFamily, overlays, spacing } from '@/theme';

import { AddressCard } from '../components/AddressCard';
import { LOCATION } from '../constants';

/**
 * 05 · Delivery location — "Pick where to deliver before anything else, so
 * every price and delivery fee below is for 30 seconds. Location denied:
 * manual entry, not serviceable: notify me." (Figma UX note)
 *
 * Geometry measured off the live MVP at 390×844
 * (see _ref/mvp/dom_location.json).
 */
export function LocationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const addresses = useLocationStore((state) => state.addresses);
  const selectedAddressId = useLocationStore((state) => state.selectedAddressId);
  const load = useLocationStore((state) => state.load);
  const selectAddress = useLocationStore((state) => state.selectAddress);
  const detect = useLocationStore((state) => state.detect);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Hero height={LOCATION.heroHeight + insets.top} style={styles.hero}>
          <Pressable
            style={[styles.backButton, { top: insets.top + LOCATION.backButton.top }]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <ChevronLeftIcon size={20} color={colors.white} />
          </Pressable>

          <Text
            variant="h3"
            tone="inverse"
            style={[styles.headerTitle, { top: insets.top + LOCATION.headerTitleTop }]}
          >
            Delivery location
          </Text>

          <Text
            variant="hero"
            tone="inverse"
            style={[styles.headline, { top: insets.top + LOCATION.headlineTop }]}
          >
            Where should we <Text tone="gold">deliver your order?</Text>
          </Text>

          <Text
            variant="bodyS"
            tone="mint"
            style={[styles.sub, { top: insets.top + LOCATION.subTop }]}
          >
            6 pharmacies deliver near you · fastest in 12 min
          </Text>
        </Hero>

        <View style={styles.body}>
          <Pressable
            style={styles.detectCard}
            onPress={() => void detect()}
            accessibilityRole="button"
            accessibilityLabel="Use my current location"
          >
            <View style={styles.detectIcon}>
              <MapPinIcon size={22} color={colors.gold} />
            </View>
            <View style={styles.detectBody}>
              <Text variant="title" tone="primary">
                Use my current location
              </Text>
              <Text variant="caption" tone="muted" style={styles.detectText}>
                Pin the exact spot for the rider
              </Text>
            </View>
            <Text variant="bodyS" tone="accent" style={styles.detectAction}>
              Detect
            </Text>
            <ChevronRightIcon size={14} color={colors.green} />
          </Pressable>

          <Text variant="eyebrow" tone="accentDeep" style={styles.sectionLabel}>
            SAVED ADDRESSES
          </Text>

          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              selected={address.id === selectedAddressId}
              onSelect={() => selectAddress(address.id)}
            />
          ))}

          <Pressable style={styles.addAddress} accessibilityRole="button">
            <PlusIcon size={18} color={colors.green} />
            <Text variant="title" tone="accent" style={styles.addAddressText}>
              Add new address
            </Text>
          </Pressable>
        </View>

        <View
          style={[
            styles.footer,
            { paddingBottom: insets.bottom + LOCATION.footer.paddingBottom },
          ]}
        >
          <Button
            label="Save and deliver here"
            disabled={!selectedAddressId}
            trailing={
              <ChevronRightIcon
                size={16}
                color={selectedAddressId ? colors.white : colors.muted}
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

  hero: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  backButton: {
    position: 'absolute',
    left: LOCATION.backButton.left,
    width: LOCATION.backButton.size,
    height: LOCATION.backButton.size,
    borderRadius: 999,
    backgroundColor: overlays.white10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    position: 'absolute',
    left: LOCATION.headerTitleLeft,
  },
  headline: {
    position: 'absolute',
    left: LOCATION.horizontalPadding,
    right: LOCATION.horizontalPadding,
  },
  sub: {
    position: 'absolute',
    left: LOCATION.horizontalPadding,
    right: LOCATION.horizontalPadding,
  },

  body: {
    paddingHorizontal: LOCATION.body.paddingHorizontal,
    paddingTop: LOCATION.body.paddingTop,
    flex: 1,
  },

  detectCard: {
    height: LOCATION.detectCard.height,
    borderRadius: LOCATION.detectCard.radius,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: LOCATION.detectCard.paddingHorizontal,
    gap: spacing.sm,
    shadowColor: colors.ink,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  detectIcon: {
    width: LOCATION.detectIcon.size,
    height: LOCATION.detectIcon.size,
    borderRadius: LOCATION.detectIcon.radius,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detectBody: { flex: 1 },
  detectText: { marginTop: 1 },
  detectAction: { fontFamily: fontFamily.bold },

  sectionLabel: {
    marginTop: LOCATION.sectionLabelMarginTop,
    marginBottom: LOCATION.sectionLabelMarginBottom,
  },

  addAddress: {
    height: LOCATION.addAddress.height,
    marginTop: LOCATION.addAddress.marginTop,
    borderRadius: LOCATION.addAddress.radius,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.green,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  addAddressText: { fontFamily: fontFamily.bold },

  footer: {
    paddingHorizontal: LOCATION.footer.paddingHorizontal,
    paddingTop: LOCATION.footer.paddingTop,
  },
});
