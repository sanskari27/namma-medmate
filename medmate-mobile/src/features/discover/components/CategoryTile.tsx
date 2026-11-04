import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors } from '@/theme';
import type { Category } from '@/types';

import { categoryScroller, homeCategoryGrid } from '../constants';

import { ProductImage } from './ProductImage';

/**
 * The 4-column category tile on the home screen.
 *
 * A rounded mint tile with the category's photo inside and the label below —
 * 81 × 103 with a 93px column pitch, exactly as measured.
 */
export function CategoryGridTile({
  category,
  onPress,
}: {
  category: Category;
  onPress?: (category: Category) => void;
}) {
  return (
    <Pressable
      onPress={() => onPress?.(category)}
      accessibilityRole="button"
      accessibilityLabel={category.label}
      style={styles.gridTile}
    >
      <View style={styles.gridTileBox}>
        <ProductImage
          url={category.imageUrl}
          brand={category.label}
          width={homeCategoryGrid.imageSize}
          height={homeCategoryGrid.imageSize}
        />
      </View>
      <Text variant="caption" tone="primary" numberOfLines={1} style={styles.gridLabel}>
        {category.label}
      </Text>
    </Pressable>
  );
}

/**
 * The circular category tile used by the horizontal scrollers on the search
 * and pharmacies screens — 68 × 68 with a 46px photo.
 */
export function CategoryCircleTile({
  category,
  onPress,
}: {
  category: Category;
  onPress?: (category: Category) => void;
}) {
  return (
    <Pressable
      onPress={() => onPress?.(category)}
      accessibilityRole="button"
      accessibilityLabel={category.label}
      style={styles.circleTile}
    >
      <View style={styles.circleBox}>
        <ProductImage
          url={category.imageUrl}
          brand={category.label}
          width={categoryScroller.imageSize}
          height={categoryScroller.imageSize}
          borderRadius={categoryScroller.imageSize / 2}
        />
      </View>
      <Text variant="caption" tone="primary" numberOfLines={2} style={styles.circleLabel}>
        {category.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gridTile: {
    width: homeCategoryGrid.tileSize,
    alignItems: 'center',
  },
  gridTileBox: {
    width: homeCategoryGrid.tileSize,
    height: homeCategoryGrid.tileSize,
    borderRadius: homeCategoryGrid.tileRadius,
    backgroundColor: colors.mint100,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  gridLabel: { marginTop: 6, textAlign: 'center' },

  circleTile: { width: categoryScroller.tileSize, alignItems: 'center' },
  circleBox: {
    width: categoryScroller.tileSize,
    height: categoryScroller.tileSize,
    borderRadius: categoryScroller.tileSize / 2,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  circleLabel: { marginTop: 6, textAlign: 'center' },
});
