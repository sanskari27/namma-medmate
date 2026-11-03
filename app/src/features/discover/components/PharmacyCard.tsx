import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors } from '@/theme';
import type { Pharmacy } from '@/types';

import { pharmacyCard } from '../constants';

import { ProductImage } from './ProductImage';

export interface PharmacyCardProps {
  pharmacy: Pharmacy;
  /** The store's headline offer ribbon. */
  offer?: string;
  /** Bottom-row highlights, e.g. "Free delivery" · "Rx accepted". */
  highlights?: string[];
  onPress?: (pharmacy: Pharmacy) => void;
}

/**
 * The full pharmacy card on the "Pharmacies near you" list.
 *
 * A photo strip across the top, the headline offer as a gold ribbon on the
 * top-left corner, then name, tagline, address, rating and highlights.
 */
export function PharmacyCard({
  pharmacy,
  offer,
  highlights = [],
  onPress,
}: PharmacyCardProps) {
  const strip = pharmacy.stripImages ?? [];

  return (
    <Pressable
      onPress={() => onPress?.(pharmacy)}
      accessibilityRole="button"
      accessibilityLabel={pharmacy.name}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.strip}>
        {strip.length > 0 ? (
          <>
            <View style={styles.stripSide}>
              <ProductImage
                url={strip[0]}
                width={93}
                height={95}
                borderRadius={12}
                contain={false}
              />
            </View>
            <View style={styles.stripCentre}>
              <ProductImage
                url={strip[1] ?? strip[0]}
                width={123}
                height={128}
                borderRadius={12}
                contain={false}
              />
            </View>
            <View style={styles.stripSide}>
              <ProductImage
                url={strip[2] ?? strip[0]}
                width={101}
                height={96}
                borderRadius={12}
                contain={false}
              />
            </View>
          </>
        ) : null}

        {pharmacy.isPromoted ? (
          <View style={styles.promoted}>
            <Text variant="tag" tone="secondary">
              Promoted
            </Text>
          </View>
        ) : null}
      </View>

      {offer ? (
        <View style={styles.ribbon}>
          <Text variant="btnS" tone="accentDeep" numberOfLines={1}>
            {offer}
          </Text>
        </View>
      ) : null}

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text variant="h3" tone="primary" numberOfLines={1} style={styles.name}>
            {pharmacy.name}
          </Text>

          <View style={styles.ratingBox}>
            <Text variant="btnS" tone="accentDeep">
              {pharmacy.rating.toFixed(1)}
            </Text>
          </View>
          {pharmacy.reviewCount ? (
            <Text variant="micro" tone="muted" style={styles.reviews}>
              {pharmacy.reviewCount}
            </Text>
          ) : null}
        </View>

        <Text variant="bodyS" tone="secondary" numberOfLines={1} style={styles.tagline}>
          {pharmacy.tagline}
        </Text>

        <View style={styles.addressRow}>
          <Text variant="caption" tone="muted" numberOfLines={1} style={styles.address}>
            {pharmacy.address} ·
          </Text>
          {pharmacy.openUntil ? (
            <Text variant="caption" tone="muted" numberOfLines={1} style={styles.open}>
              {pharmacy.openUntil}
            </Text>
          ) : null}
          <View style={styles.spacer} />
          <View style={styles.eta}>
            <Text variant="micro" tone="primary">
              {pharmacy.deliveryMinutes} min
            </Text>
          </View>
          <Text variant="micro" tone="muted">
            · {pharmacy.distanceKm} km
          </Text>
        </View>

        {highlights.length > 0 ? (
          <View style={styles.highlights}>
            {highlights.map((highlight) => (
              <Text key={highlight} variant="caption" tone="muted">
                {highlight}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: pharmacyCard.radius,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.9 },
  strip: {
    height: pharmacyCard.stripHeight,
    flexDirection: 'row',
    // The MVP bottom-aligns the strip photos: the tall centre shot sits high,
    // the two side shots sit lower.
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 10,
    backgroundColor: colors.surface2,
  },
  stripSide: { width: 101, height: 96, alignItems: 'center', justifyContent: 'center' },
  stripCentre: {
    width: 123,
    height: 128,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoted: {
    position: 'absolute',
    top: 14,
    left: 13,
    backgroundColor: 'rgba(255,255,255,0.90)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  ribbon: {
    position: 'absolute',
    top: pharmacyCard.stripHeight - 34,
    left: 0,
    maxWidth: '72%',
    backgroundColor: colors.gold,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  body: { padding: 16, paddingTop: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  name: { flex: 1 },
  ratingBox: {
    backgroundColor: colors.mint100,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  reviews: { marginLeft: 8 },
  tagline: { marginTop: 4 },
  addressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  address: { flexShrink: 0 },
  open: { flexShrink: 1 },
  spacer: { flex: 1 },
  eta: {
    backgroundColor: colors.surface,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  highlights: { flexDirection: 'row', gap: 12, marginTop: 10 },
});
