import type { StyleProp, ViewStyle } from 'react-native';

/**
 * Shared props for every icon in the registry.
 *
 * Paths are lifted verbatim from the MVP's inline SVGs: 24×24 viewBox,
 * stroke-width 1.8, round caps and joins.
 */
export interface IconProps {
  /** Rendered edge length in px. */
  size?: number;
  /** Stroke or fill colour. */
  color?: string;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
}
