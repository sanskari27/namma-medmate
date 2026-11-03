import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors } from '@/theme';
import type { Pharmacy } from '@/types';

import { pharmacyRail } from '../constants';

import { Monogram } from './TopBar';

export interface PharmacyMiniCardProps {
  pharmacy: Pharmacy;
  /** The store's headline offer, e.g. "Free delivery · no min". */
  offer?: string;
  /** Short note beside the rating, e.g. "· Fastest". */
  note?: string;
  onPress?: (pharmacy: Pharmacy) => void;
}

/**
 * The compact pharmacy card used by the "Pharmacies near you" rail on the
 * home screen — 268 × 143 with the monogram, name, address and a rating row.
 */
export function PharmacyMiniCard({
  pharmacy,
  offer,
  note,
  onPress,
}: PharmacyMiniCardProps) {
  return (
    <Pressable
      onPress={() => onPress?.(pharmacy)}
      accessibilityRole="button"
      accessibilityLabel={pharmacy.name}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.head}>
        <Monogram
          label={pharmacy.shortName}
          size={pharmacyRail.avatarSize}
          radius={pharmacyRail.avatarRadius}
          fontSize={15}
        />

        <View style={styles.headText}>
          <Text variant="title" tone="primary" numberOfLines={1}>
            {pharmacy.name}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1} style={styles.address}>
            {pharmacy.address} · {pharmacy.distanceKm} km
          </Text>
        </View>
      </View>

      <View style={styles.meta}>
        <View style={styles.eta}>
          <Text variant="micro" tone="accentDeep">
            {pharmacy.deliveryMinutes} min
          </Text>
        </View>
        <Text variant="micro" tone="primary">
          {pharmacy.rating.toFixed(1)}
        </Text>
        {note ? (
          <Text variant="caption" tone="accentDeep">
            {note}
          </Text>
        ) : null}
      </View>

      {offer ? (
        <Text variant="caption" tone="gold" numberOfLines={1} style={styles.offer}>
          {offer}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: pharmacyRail.cardWidth,
    height: pharmacyRail.cardHeight,
    borderRadius: pharmacyRail.cardRadius,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    padding: 15,
  },
  pressed: { opacity: 0.9 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headText: { flex: 1 },
  address: { marginTop: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  eta: {
    backgroundColor: colors.mint100,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  offer: { marginTop: 8 },
});
