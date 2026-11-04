/**
 * Public design-system surface.
 *
 *   import { colors, typography, spacing, gradients, useTypography } from '@/theme';
 */

export { colors, overlays, type ColorToken, type ColorValue } from './colors';

export {
  fontFamily,
  typography,
  textColors,
  fontScalePolicy,
  clampSystemFontScale,
  clampUserFontScale,
  resolveTextScale,
  scaleTypography,
  type FontWeightToken,
  type TypeStyle,
  type Typography,
  type TypographyToken,
  type TextTone,
} from './typography';

export {
  spacing,
  radius,
  easing,
  duration,
  gradients,
  type GradientName,
} from './layout';

export { TypographyProvider, useTypography } from './TypographyProvider';
export type {
  TypographyContextValue,
  TypographyProviderProps,
} from './TypographyProvider';
