import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors } from '@/theme';

/**
 * The gold "15 % OFF" ribbon.
 *
 * It sits on top-left of a product photo, so the top corners are square and
 * the bottom corners are rounded — matching the MVP.
 */
export function DiscountBadge({ percent }: { percent: number }) {
  return (
    <View style={styles.discount}>
      <Text variant="tag" tone="primary" style={styles.discountText}>
        {percent} % OFF
      </Text>
    </View>
  );
}

/** The red "Rx" marker on prescription products. */
export function RxBadge() {
  return (
    <View style={styles.rx}>
      <Text variant="tag" tone="danger">
        Rx
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  discount: {
    backgroundColor: colors.gold,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderBottomRightRadius: 8,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    alignSelf: 'flex-start',
  },
  discountText: { color: colors.forest },
  rx: {
    backgroundColor: colors.redBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
});
