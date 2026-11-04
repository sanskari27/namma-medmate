/**
 * Onboarding geometry.
 *
 * Every number here was measured off the live MVP at a 390×844 reference
 * viewport (see `_ref/mvp_dom.json`). The native screens use these values so
 * the app and the web prototype stay pixel-identical.
 *
 * Rule of thumb: if a number is not in this file, it does not belong in a
 * screen — it belongs in the design system.
 */

/** The reference viewport the MVP was measured against. */
export const REFERENCE_VIEWPORT = { width: 390, height: 844 } as const;

/* --------------------------------- splash --------------------------------- */

export const SPLASH = {
  /** How long the brand moment holds before handing over to Login. */
  durationMs: 2200,
  /** Top of the wordmark block, measured from the top of the screen. */
  blockTop: 382,
  wordmarkSize: 56,
  wordmarkTracking: -1.96,
  pulseSize: 150,
  pulseMarginTop: 12,
  taglineMarginTop: 14,
  taglineTracking: 0.88,
} as const;

/* --------------------------------- login ---------------------------------- */

export const LOGIN = {
  heroHeight: 484,
  horizontalPadding: 20,

  logoSize: 36,
  logoLineHeight: 45,
  logoTracking: -0.72,
  brandBlockTop: 98,
  taglineMarginTop: 2,
  taglineTracking: 0.88,

  collage: {
    marginTop: 20,
    height: 116,
    width: 219,
    left: { width: 91, height: 84 },
    middle: { width: 46, height: 116, marginLeft: -9 },
    right: { width: 103, height: 84, marginLeft: -12 },
  },

  featureStrip: {
    marginTop: 20,
    width: 342,
    height: 78,
    radius: 16,
    itemPaddingVertical: 13,
    dividerWidth: 1,
    dividerHeight: 40,
    labelMarginTop: 6,
  },

  card: {
    radius: 32,
    paddingTop: 28,
  },

  headlineMarginBottom: 8,
  fieldMarginTop: 20,
  inputHeight: 56,
  inputMarginTop: 6,
  inputRadius: 16,
  hintMarginTop: 6,
  buttonHeight: 52,
  buttonMarginTop: 16,
  buttonRadius: 12,
  termsMarginTop: 12,
} as const;

/* ----------------------------------- otp ---------------------------------- */

export const OTP = {
  heroHeight: 540,
  horizontalPadding: 20,

  backButton: { size: 36, top: 16, left: 16 },
  headerBrandTop: 14,
  headerBrandSize: 24,
  headerBrandTracking: -0.84,

  iconWrap: { size: 72, top: 198 },
  iconBadge: { size: 26, right: -8, bottom: -6 },

  titleTop: 286,
  sentToTop: 327,
  changeNumberTop: 360,
  changeNumberHeight: 32,
  changeNumberPaddingHorizontal: 14,

  card: { radius: 32, paddingTop: 32, paddingBottom: 16 },

  boxSize: 63,
  boxHeight: 62,
  boxRadius: 16,
  boxGap: 12,
  /** Number of digits in the SMS code. */
  codeLength: 4,

  resendMarginTop: 18,
  verifyMarginTop: 14,
  privacyMarginTop: 16,
  privacyPaddingHorizontal: 12,
  privacyPaddingVertical: 12,
  privacyRadius: 16,

  /** The Figma UX note says the resend countdown starts after 30 seconds. */
  resendAfterSeconds: 30,
  /** The MVP screenshot was captured with a few seconds already elapsed. */
  initialCountdownSeconds: 27,
} as const;

/* --------------------------------- consent -------------------------------- */

export const CONSENT = {
  heroHeight: 394,
  horizontalPadding: 20,

  brandTop: 96,
  brandSize: 28,
  brandTracking: -0.98,

  shieldWrap: { size: 68, top: 144 },
  titleTop: 213,
  ledeTop: 246,
  ledeHorizontalInset: 35,

  card: { radius: 32, paddingTop: 24, paddingBottom: 24 },

  included: {
    radius: 16,
    paddingHorizontal: 17,
    paddingTop: 17,
    paddingBottom: 19,
    labelMarginBottom: 12,
    itemGap: 10,
    itemMarginBottom: 16,
    iconSize: 34,
    iconRadius: 8,
  },

  agreeBox: {
    radius: 16,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 18,
    marginTop: 16,
  },
  checkboxSize: 24,
  checkboxRadius: 6,
  legalMarginTop: 18,
  agreeMarginTop: 16,
} as const;

/* -------------------------------- location -------------------------------- */

export const LOCATION = {
  heroHeight: 230,
  horizontalPadding: 16,

  backButton: { size: 36, top: 16, left: 16 },
  headerTitleTop: 22,
  headerTitleLeft: 64,
  headlineTop: 70,
  subTop: 130,

  body: { paddingHorizontal: 16, paddingTop: 16 },

  detectCard: { height: 80, radius: 24, paddingHorizontal: 16 },
  detectIcon: { size: 50, radius: 12 },

  sectionLabelMarginTop: 16,
  sectionLabelMarginBottom: 10,

  addressCard: { height: 98, radius: 16, paddingHorizontal: 16 },
  addressIcon: { size: 44, radius: 12 },
  radioOuter: { size: 22, borderWidth: 1.5 },
  radioInner: { size: 12 },

  addAddress: { height: 48, marginTop: 10, radius: 16 },

  footer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 },
} as const;
