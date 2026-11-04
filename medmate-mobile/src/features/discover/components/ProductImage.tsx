import {
  Image,
  StyleSheet,
  View,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Text } from '@/components/ui';
import { resolveImage } from '@/assets/products';
import { colors } from '@/theme';

/**
 * A catalogue photo, with the MVP's built-in fallback.
 *
 * Some products have no photography in the catalogue (the Pulse Oximeter, for
 * one). The MVP renders a dark tile with a stock percentage and the brand, and
 * this component reproduces that exactly so the layouts never collapse.
 */
export interface ProductImageProps {
  /** Remote image URL; the bundled asset is preferred when one matches. */
  url?: string | null;
  /** Brand shown in the fallback tile. */
  brand?: string;
  width?: number;
  height?: number;
  borderRadius?: number;
  /** Draw the photo on a white sheet (category grid) instead of the fallback. */
  contain?: boolean;
  style?: StyleProp<ImageStyle>;
  testID?: string;
}

export function ProductImage({
  url,
  brand,
  width,
  height,
  borderRadius = 0,
  contain = true,
  style,
  testID,
}: ProductImageProps) {
  const source = resolveImage(url);
  // Plain object (not a ViewStyle) so it satisfies both Image and View styles.
  const box = { width, height, borderRadius };

  if (source) {
    return (
      <Image
        source={source}
        style={[box, contain && styles.contain, style]}
        resizeMode={contain ? 'contain' : 'cover'}
        testID={testID}
      />
    );
  }

  return (
    <View style={[styles.fallback, box, style as StyleProp<ViewStyle>]} testID={testID}>
      <Text variant="title" tone="mint" style={styles.fallbackValue}>
        98%
      </Text>
      {brand ? (
        <Text variant="tag" tone="mint" numberOfLines={1} style={styles.fallbackBrand}>
          {brand}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contain: { resizeMode: 'contain' },
  fallback: {
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  fallbackValue: { fontSize: 14, lineHeight: 18 },
  fallbackBrand: { opacity: 0.8 },
});
