import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors } from '@/theme';
import type { Product } from '@/types';
import { formatCurrency } from '@/utils';

import { productRail } from '../constants';

import { DiscountBadge, RxBadge } from './Badges';
import { PriceRow } from './PriceRow';
import { ProductImage } from './ProductImage';

export interface ProductCardProps {
  product: Product;
  onPress?: (product: Product) => void;
  onAdd?: (product: Product) => void;
  /** Height of the info block — the Rx rail is 17px taller. */
  tall?: boolean;
}

/**
 * The 112px product card used by every horizontal rail — "Flash deals",
 * "Best offers near you" and "Prescription medicines".
 *
 * The photo sits in a bordered 112 × 124 sheet, the ADD button overlaps its
 * bottom-right corner, and the price/name/subtitle stack below.
 */
export function ProductCard({ product, onPress, onAdd, tall = false }: ProductCardProps) {
  return (
    <Pressable
      onPress={() => onPress?.(product)}
      accessibilityRole="button"
      accessibilityLabel={`${product.name}, ${formatCurrency(product.sellingPrice)}`}
      style={styles.card}
    >
      <View style={styles.sheet}>
        <View style={styles.badgeSlot}>
          <DiscountBadge percent={product.discountPercent} />
        </View>

        {product.requiresPrescription ? (
          <View style={styles.rxSlot}>
            <RxBadge />
          </View>
        ) : null}

        <View style={styles.photo}>
          <ProductImage
            url={product.imageUrl}
            brand={product.brand}
            width={productRail.imageWidth}
            height={productRail.imageHeightInner}
          />
        </View>

        <View style={styles.addSlot}>
          <AddButton onPress={() => onAdd?.(product)} />
        </View>
      </View>

      <View style={styles.info}>
        <PriceRow
          price={product.sellingPrice}
          mrp={product.mrp}
          variant="rail"
          format={formatCurrency}
        />
        <Text variant="product" tone="primary" numberOfLines={1} style={styles.name}>
          {product.name}
        </Text>
        <Text
          variant="caption"
          tone="muted"
          numberOfLines={tall ? 2 : 2}
          style={styles.subtitle}
        >
          {product.subtitle ?? product.packSize}
        </Text>
      </View>
    </Pressable>
  );
}

/** Local import indirection keeps the ADD button out of the card's press area. */
function AddButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Add to cart"
      style={({ pressed }) => [styles.add, pressed && styles.addPressed]}
    >
      <Text variant="btnS" tone="accent">
        ADD
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: productRail.cardWidth },
  sheet: {
    height: productRail.imageHeight,
    borderRadius: productRail.imageRadius,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  badgeSlot: { position: 'absolute', top: 0, left: 0 },
  rxSlot: { position: 'absolute', top: 0, right: 0 },
  photo: {
    position: 'absolute',
    top: 24,
    left: 9,
    width: productRail.imageWidth,
    height: productRail.imageHeightInner,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSlot: { position: 'absolute', top: 84, right: 7 },
  add: {
    width: productRail.addWidth,
    height: productRail.addHeight,
    borderRadius: productRail.addRadius,
    borderWidth: 1,
    borderColor: colors.line2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPressed: { opacity: 0.8 },
  info: { marginTop: 8 },
  name: { marginTop: 2 },
  subtitle: { marginTop: 1 },
});
