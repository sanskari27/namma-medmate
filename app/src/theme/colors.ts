/**
 * MedMate colour palette.
 *
 * Ported 1:1 from the live MVP stylesheet
 * (https://medmate-india.netlify.app → Tailwind v4 `--color-*` properties)
 * and cross-checked against the Figma "Design system → Colour" page.
 */

export const colors = {
  /* ------------------------------ brand ------------------------------ */
  forest: '#1b3d29',
  green: '#2f7d52',
  green700: '#256b46',

  /* ------------------------------- mint ------------------------------ */
  mint: '#8fd4a8',
  mint50: '#f4fbf6',
  mint100: '#e9f6ee',
  mint200: '#d9f0e1',
  mint300: '#bde5cb',

  /* ------------------------------- gold ------------------------------ */
  gold: '#d9a648',
  gold50: '#fdf8ea',
  gold100: '#faedc9',
  gold200: '#f2d996',
  goldInk: '#855b0c',

  /* ---------------------------- ink / text ---------------------------- */
  ink: '#14201a',
  ink2: '#3b4842',
  muted: '#65726b',
  faint: '#9aa59f',

  /* ------------------------------- lines ----------------------------- */
  line: '#e7ece9',
  line2: '#d5ddd8',

  /* ----------------------------- surfaces ---------------------------- */
  surface: '#ffffff',
  surface2: '#f5f8f6',
  surface3: '#edf2ef',

  /* ------------------------------ status ----------------------------- */
  red: '#c2392d',
  redBg: '#fcece9',

  white: '#ffffff',
  transparent: 'transparent',
} as const;

export type ColorToken = keyof typeof colors;
export type ColorValue = (typeof colors)[ColorToken];

/** Common alpha variants used over the dark brand gradient. */
export const overlays = {
  white10: 'rgba(255,255,255,0.10)',
  white07: 'rgba(255,255,255,0.07)',
  white20: 'rgba(255,255,255,0.20)',
} as const;
