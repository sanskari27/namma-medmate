import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { NamedIcon } from '@/components/icons';
import { Text } from '@/components/ui';
import { colors } from '@/theme';

import { offerStrip, pharmacyOfferStrip } from '../constants';

export interface OfferItem {
  id: string;
  title: string;
  code: string;
  /** Icon key from the registry. */
  icon: string;
}

export interface OfferStripProps {
  offers: OfferItem[];
  onApply?: (offer: OfferItem) => void;
  /** The pharmacy page uses taller, solid-bordered cards. */
  variant?: 'product' | 'pharmacy';
}

/**
 * The row of offer cards.
 *
 * On the product page the cards are dashed (tap to apply a code); on the
 * pharmacy page they are solid and the first one is already applied.
 */
export function OfferStrip({ offers, onApply, variant = 'product' }: OfferStripProps) {
  const isProduct = variant === 'product';
  const cardHeight = isProduct ? offerStrip.cardHeight : pharmacyOfferStrip.cardHeight;
  const iconSize = isProduct ? offerStrip.iconSize : pharmacyOfferStrip.iconSize;
  const titleVariant = isProduct ? 'btnS' : 'title';
  const cardWidth = isProduct ? 260 : 256;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      style={styles.root}
    >
      {offers.map((offer) => {
        return (
          <Pressable
            key={offer.id}
            onPress={() => onApply?.(offer)}
            accessibilityRole="button"
            accessibilityLabel={`${offer.title}, code ${offer.code}`}
            style={({ pressed }) => [
              styles.card,
              { minHeight: cardHeight, width: cardWidth },
              isProduct ? styles.cardDashed : styles.cardSolid,
              pressed && styles.pressed,
            ]}
          >
            <View
              style={[
                styles.icon,
                {
                  width: iconSize,
                  height: iconSize,
                  borderRadius: isProduct
                    ? offerStrip.iconRadius
                    : pharmacyOfferStrip.iconRadius,
                },
              ]}
            >
              <NamedIcon name={offer.icon} size={16} color={colors.forest} />
            </View>

            <View style={styles.copy}>
              <Text
                variant={titleVariant}
                tone="primary"
                numberOfLines={isProduct ? 1 : 2}
              >
                {offer.title}
              </Text>
              <Text variant="caption" tone="gold" numberOfLines={1}>
                {offer.code} · tap to apply
              </Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {},
  content: { paddingHorizontal: 16, gap: offerStrip.gap, alignItems: 'center' },
  card: {
    width: 260,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 11,
    paddingVertical: 10,
    backgroundColor: colors.gold50,
    borderRadius: offerStrip.cardRadius,
  },
  cardDashed: { borderWidth: 1, borderStyle: 'dashed', borderColor: colors.gold },
  cardSolid: { borderWidth: 1, borderColor: colors.gold },
  pressed: { opacity: 0.85 },
  icon: { backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
});
