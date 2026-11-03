import { colors } from './colors';

/**
 * Registered font families. The variable Outfit source is split into static
 * instances at build time (see tools/) because React Native resolves custom
 * fonts by file name on Android and by PostScript name on iOS.
 */
export const fontFamily = {
  regular: 'Outfit-Regular',
  medium: 'Outfit-Medium',
  semibold: 'Outfit-SemiBold',
  bold: 'Outfit-Bold',
  extrabold: 'Outfit-ExtraBold',
} as const;

export type FontWeightToken = keyof typeof fontFamily;

export interface TypeStyle {
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
  letterSpacing?: number;
}

/**
 * The MVP's `t-*` type scale. `letterSpacing` is expressed in `em` in the CSS;
 * it is resolved to absolute px here because React Native expects px.
 *
 * These are the *base* values, measured 1:1 off the live MVP. Runtime scaling
 * is applied by `scaleTypography()` — never by editing these numbers.
 */
export const typography = {
  display: {
    fontSize: 40,
    lineHeight: 40,
    fontFamily: fontFamily.extrabold,
    letterSpacing: -1.4,
  },
  h1: { fontSize: 22, lineHeight: 26, fontFamily: fontFamily.bold, letterSpacing: -0.44 },
  h2: { fontSize: 20, lineHeight: 24, fontFamily: fontFamily.bold, letterSpacing: -0.4 },
  hero: {
    fontSize: 24,
    lineHeight: 28,
    fontFamily: fontFamily.bold,
    letterSpacing: -0.48,
  },
  h3: { fontSize: 17, lineHeight: 22, fontFamily: fontFamily.bold, letterSpacing: -0.17 },
  title: { fontSize: 15, lineHeight: 20, fontFamily: fontFamily.semibold },
  body: { fontSize: 14, lineHeight: 20, fontFamily: fontFamily.medium },
  bodyS: { fontSize: 13, lineHeight: 18, fontFamily: fontFamily.regular },
  product: { fontSize: 13, lineHeight: 17, fontFamily: fontFamily.medium },
  caption: { fontSize: 12, lineHeight: 16, fontFamily: fontFamily.medium },
  micro: { fontSize: 11, lineHeight: 14, fontFamily: fontFamily.semibold },
  eyebrow: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: fontFamily.bold,
    letterSpacing: 0.88,
  },
  tag: { fontSize: 10, lineHeight: 16, fontFamily: fontFamily.extrabold },
  price: { fontSize: 14, lineHeight: 22, fontFamily: fontFamily.extrabold },
  amount: { fontSize: 18, lineHeight: 22, fontFamily: fontFamily.extrabold },
  total: { fontSize: 16, lineHeight: 22, fontFamily: fontFamily.bold },
  btn: { fontSize: 15, lineHeight: 20, fontFamily: fontFamily.bold },
  btnS: { fontSize: 13, lineHeight: 16, fontFamily: fontFamily.bold },
} satisfies Record<string, TypeStyle>;

export type TypographyToken = keyof typeof typography;

/** The full, resolved type scale for a given font scale. */
export type Typography = Record<TypographyToken, TypeStyle>;

/** Semantic colour bindings for the type scale. */
export const textColors = {
  primary: colors.ink,
  secondary: colors.ink2,
  muted: colors.muted,
  faint: colors.faint,
  accent: colors.green,
  accentDeep: colors.green700,
  inverse: colors.white,
  gold: colors.gold,
  mint: colors.mint200,
  danger: colors.red,
} as const;

export type TextTone = keyof typeof textColors;

/* -------------------------------------------------------------------------- */
/*                            Font-scale policy                                */
/* -------------------------------------------------------------------------- */

/**
 * Why the app owns its font scale
 * -------------------------------
 * React Native applies the OS font-size setting to every `<Text>` by default
 * (`allowFontScaling` is `true` and the scale is applied natively). Several
 * Android OEM builds ship `font_scale < 1.0`, which silently shrinks every
 * piece of copy while our containers keep their measured heights — the same
 * build then looks pixel-perfect on one handset and broken on another.
 *
 * The rules below make rendering deterministic:
 *
 *   1. The base scale is always 1.0 — the geometry measured off the MVP.
 *   2. The OS setting is honoured **only above** 1.0 and capped at 1.3, so a
 *      device set to "small" renders identically to a device set to "default".
 *   3. The user picks an in-app size (Account → Text size) which is applied on
 *      top, and persisted across launches.
 */
export const fontScalePolicy = {
  system: { min: 1, max: 1.3 },
  user: { min: 0.85, max: 1.3 },
  effective: { min: 0.85, max: 1.4 },
} as const;

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/**
 * Normalise the OS font scale.
 *
 * Anything below 1.0 is ignored on purpose — that is the setting that made
 * one handset render MedMate's copy too small to read.
 */
export function clampSystemFontScale(systemScale: number): number {
  return clamp(systemScale, fontScalePolicy.system.min, fontScalePolicy.system.max);
}

/** Normalise the in-app preference (Account → Text size). */
export function clampUserFontScale(userScale: number): number {
  return clamp(userScale, fontScalePolicy.user.min, fontScalePolicy.user.max);
}

/** Combine the OS setting and the in-app preference into one effective scale. */
export function resolveTextScale(userScale: number, systemScale: number): number {
  const combined = clampUserFontScale(userScale) * clampSystemFontScale(systemScale);
  return clamp(combined, fontScalePolicy.effective.min, fontScalePolicy.effective.max);
}

function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Produce a type scale for the given effective scale.
 *
 * Font sizes and line heights scale together so the vertical rhythm is kept;
 * letter spacing scales as well because it is defined relative to the glyph
 * size in the original CSS.
 */
export function scaleTypography(scale: number): Typography {
  if (scale === 1) return typography;

  const scaled = {} as Typography;

  for (const key of Object.keys(typography) as TypographyToken[]) {
    const style: TypeStyle = typography[key];
    scaled[key] = {
      ...style,
      fontSize: round(style.fontSize * scale),
      lineHeight: round(style.lineHeight * scale),
      letterSpacing:
        style.letterSpacing === undefined
          ? undefined
          : round(style.letterSpacing * scale, 2),
    };
  }

  return scaled;
}
