import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors } from '@/theme';
import type { Product } from '@/types';
import { formatCurrency } from '@/utils';

import { productGrid } from '../constants';

import { DiscountBadge, RxBadge } from './Badges';
import { PriceRow } from './PriceRow';
import { ProductImage } from './ProductImage';

export interface ProductTileProps {
  product: Product;
  onPress?: (product: Product) => void;
  onAdd?: (product: Product) => void;
}

/**
 * The 173 × 230 product card used by the two-column grid on the category
 * screen. Same anatomy as the rail card, at the grid's larger type sizes.
 */
export function ProductTile({ product, onPress, onAdd }: ProductTileProps) {
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
            width={productGrid.imageWidth}
            height={108}
          />
        </View>
      </View>

      <Pressable
        onPress={() => onAdd?.(product)}
        accessibilityRole="button"
        accessibilityLabel="Add to cart"
        style={({ pressed }) => [styles.add, pressed && styles.addPressed]}
      >
        <Text variant="btnS" tone="accent">
          ADD
        </Text>
      </Pressable>

      <Text variant="title" tone="primary" numberOfLines={1} style={styles.name}>
        {product.name}
      </Text>
      <Text variant="caption" tone="muted" numberOfLines={2} style={styles.subtitle}>
        {product.subtitle ?? product.packSize}
      </Text>

      <View style={styles.price}>
        <PriceRow
          price={product.sellingPrice}
          mrp={product.mrp}
          variant="grid"
          format={formatCurrency}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: productGrid.cardWidth,
    backgroundColor: colors.surface,
    borderRadius: productGrid.cardRadius,
    borderWidth: 1,
    borderColor: colors.line,
    paddingBottom: 14,
    overflow: 'hidden',
  },
  // The MVP's grid cards put the photo on a pale mint sheet.
  sheet: {
    height: productGrid.imageHeight,
    backgroundColor: colors.mint50,
  },
  badgeSlot: { position: 'absolute', top: 0, left: 0 },
  rxSlot: { position: 'absolute', top: 6, right: 9 },
  photo: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  // Straddles the bottom edge of the photo sheet, as in the MVP.
  add: {
    position: 'absolute',
    top: 114,
    right: 11,
    width: 56,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line2,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPressed: { opacity: 0.8 },
  name: { marginTop: 18, marginHorizontal: 12 },
  subtitle: { marginTop: 2, marginHorizontal: 12 },
  price: { marginTop: 8, marginHorizontal: 12 },
});
