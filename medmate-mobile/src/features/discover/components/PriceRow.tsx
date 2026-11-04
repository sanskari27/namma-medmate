import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors } from '@/theme';

import { productRail } from '../constants';

export interface AddButtonProps {
  onPress?: () => void;
  label?: string;
  /** Set once the product is in the cart. */
  inCart?: boolean;
  testID?: string;
}

/**
 * The small white "ADD" button on a product card.
 *
 * It is a real button, not a label — tapping it adds the product to the cart.
 */
export function AddButton({
  onPress,
  label = 'ADD',
  inCart = false,
  testID,
}: AddButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={inCart ? `${label} — in cart` : label}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        { width: productRail.addWidth, minHeight: productRail.addHeight },
        pressed && styles.pressed,
      ]}
    >
      <Text variant="btnS" tone="accent">
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Price + struck-through MRP.
 *
 * Three arrangements are used across the catalogue, so the variant picks the
 * measured type styles rather than re-deriving them at each call site.
 */
export type PriceRowVariant = 'rail' | 'grid' | 'detail';

export interface PriceRowProps {
  price: number;
  mrp: number;
  variant: PriceRowVariant;
  /** Currency-formatted price, e.g. "₹47". */
  format: (amount: number) => string;
  /** "You save ₹9" — only on the detail screen. */
  saving?: string;
}

export function PriceRow({ price, mrp, variant, format, saving }: PriceRowProps) {
  if (variant === 'detail') {
    return (
      <View style={styles.detailRow}>
        <Text variant="display" tone="accentDeep" style={styles.detailPrice}>
          {format(price)}
        </Text>
        <Text variant="body" tone="muted" style={styles.detailMrp}>
          {format(mrp)}
        </Text>
        {saving ? (
          <View style={styles.saving}>
            <Text variant="btnS" tone="accentDeep">
              {saving}
            </Text>
          </View>
        ) : null}
      </View>
    );
  }

  if (variant === 'grid') {
    return (
      <View style={styles.inlineRow}>
        <Text variant="title" tone="primary">
          {format(price)}
        </Text>
        <Text variant="caption" tone="muted">
          {format(mrp)}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.inlineRow}>
      <View style={styles.pricePill}>
        <Text variant="price" tone="inverse">
          {format(price)}
        </Text>
      </View>
      <Text variant="caption" tone="muted">
        {format(mrp)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius: productRail.addRadius,
    borderWidth: 1,
    borderColor: colors.line2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  pressed: { opacity: 0.8 },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pricePill: {
    backgroundColor: colors.green700,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailPrice: { fontSize: 34, lineHeight: 38 },
  detailMrp: { textDecorationLine: 'line-through' },
  saving: {
    backgroundColor: colors.mint100,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
});
