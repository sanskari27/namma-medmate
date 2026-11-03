import { colors } from './colors';

export const spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const;

export const radius = {
  none: 0,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  card: 32,
  pill: 999,
} as const;

/**
 * `cubic-bezier(.2,.8,.2,1)` — the MVP's `--ease-settle`.
 * Expressed as [x1, y1, x2, y2] for `Animated.timing` / `Easing`.
 */
export const easing = {
  settle: [0.2, 0.8, 0.2, 1] as const,
};

export const duration = {
  press: 120,
  fast: 200,
  base: 320,
  slow: 500,
} as const;

/**
 * Named gradients from the MVP stylesheet.
 *
 * The MVP declares them as `linear-gradient(180deg, …)`, i.e. top to bottom,
 * so the start/end points are part of the token — passing them to
 * `expo-linear-gradient` reproduces the web build exactly.
 */
export const gradients = {
  /** `brand-zone` — the onboarding hero wash and the home header. */
  brand: {
    from: colors.forest,
    to: colors.green700,
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  },
  /** `tint-zone` */
  tint: {
    from: colors.white,
    to: colors.mint200,
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  },
  /** `art-bg` */
  art: {
    from: colors.mint50,
    to: colors.mint200,
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  },
  /** `tint-mint` */
  mint: {
    from: colors.mint100,
    to: colors.mint200,
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  },
} as const;

export type GradientName = keyof typeof gradients;
