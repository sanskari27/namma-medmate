/**
 * Measured geometry for the Discover feature.
 *
 * Every number here was read off the live MVP's DOM (captured under
 * `_ref/mvp/`) at a 390 × 844 viewport, then cross-checked against the Figma
 * frames. They are the contract for these screens — change them only when the
 * design changes, and re-measure rather than eyeballing.
 *
 * The MVP is a web build with no status bar, so the native screens add
 * `insets.top` on top of these values.
 */

/** The design width the measurements were taken at. */
export const DESIGN_WIDTH = 390;

/** Horizontal page gutter used by every screen. */
export const GUTTER = 16;

/** Content width inside the gutter. */
export const CONTENT_WIDTH = DESIGN_WIDTH - GUTTER * 2; // 358

/* --------------------------------- home ---------------------------------- */

export const homeHeader = {
  /** The green hero zone at the top of the home screen. */
  height: 468,
  bottomRadius: 24,
  wordmarkSize: 26,
  actionSize: 36,
  /** Delivery promise row. */
  deliveryTop: 66,
  deliveryHeight: 42,
  deliveryTextSize: 20,
  boltSize: 22,
  /** Delivery address row. */
  addressTop: 90,
  addressTextSize: 12,
  /** Search field. */
  searchTop: 126,
  searchHeight: 48,
  searchRadius: 12,
  searchIconSize: 20,
  searchIconLeft: 14,
  searchTextLeft: 44,
  uploadRxWidth: 103,
  uploadRxHeight: 36,
  uploadRxRadius: 8,
} as const;

export const homeQuickActions = {
  cardTop: 186,
  cardHeight: 110,
  cardRadius: 16,
  itemWidth: 114,
  itemHeight: 82,
  itemTop: 204,
  iconTile: 44,
  iconTileRadius: 12,
  iconSize: 22,
  labelSize: 12,
} as const;

export const homePromo = {
  top: 312,
  height: 128,
  radius: 24,
  eyebrowSize: 11,
  titleSize: 40,
  subtitleSize: 13,
  ctaWidth: 114,
  ctaHeight: 36,
  ctaRadius: 8,
  codeWidth: 91,
  codeHeight: 36,
  codeRadius: 8,
  /** Photo block on the right-hand side of the banner. */
  artWidth: 124,
  artHeight: 104,
  artTop: 12,
  artLeft: 242,
} as const;

export const homeTrustStrip = {
  top: 492,
  height: 40,
  radius: 12,
  iconSize: 14,
  labelSize: 12,
  /** Left edge of each of the three items. */
  itemLefts: [31, 153, 285] as const,
} as const;

/** "Shop by category" — the 4-column grid under the trust strip. */
export const homeCategoryGrid = {
  top: 600,
  tileSize: 81,
  tileRadius: 16,
  imageSize: 65,
  imageInset: 8,
  labelSize: 12,
  labelTop: 690,
  columns: 4,
  columnGap: 93,
  rowGap: 117,
  /** "See all 29 categories" pill. */
  seeAllTop: 834,
  seeAllWidth: 172,
  seeAllHeight: 36,
} as const;

/** "Flash deals" / "Best offers near you" — the horizontal product rail. */
export const productRail = {
  cardWidth: 112,
  cardHeight: 207,
  imageHeight: 124,
  imageRadius: 12,
  imageWidth: 94,
  imageHeightInner: 66,
  gap: 12,
  badgeHeight: 18,
  badgeRadiusBottom: 8,
  badgeRadiusTop: 12,
  addWidth: 56,
  addHeight: 32,
  addRadius: 8,
  priceSize: 14,
  nameSize: 13,
  subtitleSize: 12,
  /** Cards in the "Prescription medicines" rail are 17px taller. */
  rxCardHeight: 224,
} as const;

export const homeCountdown = {
  top: 954,
  height: 22,
  boxWidth: 26,
  boxRadius: 6,
  labelSize: 12,
  valueSize: 11,
} as const;

/** "Pharmacies near you" — the horizontal pharmacy rail. */
export const pharmacyRail = {
  top: 1284,
  cardWidth: 268,
  cardHeight: 143,
  cardRadius: 16,
  gap: 12,
  avatarSize: 44,
  avatarRadius: 12,
  nameSize: 15,
  metaSize: 11,
  offerSize: 12,
} as const;

export const homeLabsBanner = {
  top: 1452,
  height: 180,
  radius: 16,
  eyebrowSize: 11,
  titleSize: 20,
  subtitleSize: 12,
  ctaWidth: 108,
  ctaHeight: 36,
  ctaRadius: 8,
  artSize: 76,
} as const;

/* -------------------------------- search --------------------------------- */

export const searchHeader = {
  height: 76,
  bottomRadius: 24,
  backSize: 36,
  fieldLeft: 64,
  fieldWidth: 254,
  fieldHeight: 44,
  fieldRadius: 12,
  filterSize: 44,
  filterRadius: 12,
} as const;

export const popularSearches = {
  chipHeight: 36,
  chipRadius: 999,
  chipGap: 8,
  iconSize: 14,
  textSize: 14,
} as const;

/** The circular category scroller used on search and pharmacies. */
export const categoryScroller = {
  tileSize: 68,
  imageSize: 46,
  labelSize: 10,
  gap: 14,
  itemHeight: 106,
} as const;

/* ------------------------------- category -------------------------------- */

export const categoryHeader = {
  height: 174,
  bottomRadius: 24,
  backSize: 36,
  titleSize: 30,
  eyebrowSize: 11,
  subtitleSize: 13,
  artSize: 92,
  artRadius: 24,
} as const;

/** The vertical category rail on the category screen. */
export const categoryRail = {
  tileSize: 64,
  imageSize: 64,
  imageTop: 199,
  labelSize: 12,
  labelTop: 260,
  gap: 12,
} as const;

export const filterChips = {
  height: 32,
  radius: 999,
  textSize: 14,
  gap: 8,
  iconSize: 14,
} as const;

export const brandChips = {
  height: 28,
  radius: 999,
  textSize: 12,
  gap: 8,
} as const;

/** The 2-column product grid on the category screen. */
export const productGrid = {
  cardWidth: 173,
  cardHeight: 230,
  cardRadius: 16,
  imageHeight: 132,
  imageWidth: 147,
  gap: 12,
  nameSize: 15,
  subtitleSize: 12,
  priceSize: 16,
} as const;

/* -------------------------------- product -------------------------------- */

export const productHeader = {
  barHeight: 40,
  barTop: 12,
  buttonSize: 40,
  galleryHeight: 188,
  galleryTop: 60,
  thumbSize: 48,
  thumbRadius: 12,
  thumbGap: 6,
} as const;

export const productDetail = {
  titleSize: 24,
  eyebrowSize: 11,
  subtitleSize: 13,
  priceSize: 34,
  mrpSize: 14,
  tagSize: 11,
  tagRadius: 6,
  tagHeight: 18,
  savingWidth: 103,
  savingHeight: 20,
  savingRadius: 6,
  discountWidth: 90,
  discountHeight: 28,
  discountRadius: 8,
  /** The dark "available at N pharmacies" banner. */
  availabilityHeight: 64,
  availabilityRadius: 16,
  availabilityIconTile: 40,
  availabilityIconSize: 18,
  /** "Where to get it" list card. */
  storesHeight: 238,
  storesRadius: 16,
  storeRowHeight: 61,
  storeAvatarSize: 36,
  storeAvatarRadius: 8,
} as const;

/** The sticky bottom bar that carries "Add to cart". */
export const productCtaBar = {
  height: 89,
  radius: 24,
  buttonHeight: 52,
  buttonRadius: 12,
  buttonLeft: 71,
  buttonWidth: 303,
} as const;

export const offerStrip = {
  cardHeight: 54,
  cardRadius: 16,
  iconSize: 32,
  iconRadius: 8,
  titleSize: 13,
  codeSize: 12,
  gap: 12,
} as const;

export const productTabs = {
  height: 44,
  textSize: 15,
  gap: 8,
} as const;

export const specList = {
  labelWidth: 112,
  valueLeft: 128,
  rowHeight: 41,
  labelSize: 14,
} as const;

/** The Rx prescription notice. */
export const rxNotice = {
  height: 78,
  radius: 16,
  iconTile: 40,
  iconTileRadius: 12,
  titleSize: 15,
  bodySize: 12,
} as const;

/** Pack / form / storage tiles on the Rx product screen. */
export const rxFacts = {
  iconSize: 18,
  labelSize: 12,
  valueSize: 15,
} as const;

/* ------------------------------ pharmacies ------------------------------- */

export const pharmaciesHeader = {
  height: 194,
  bottomRadius: 24,
  titleSize: 24,
  subtitleSize: 13,
  accentSize: 24,
  fieldTop: 126,
  fieldHeight: 48,
  fieldRadius: 12,
} as const;

export const promoCarousel = {
  top: 192,
  cardWidth: 308,
  cardHeight: 132,
  cardRadius: 24,
  gap: 12,
  eyebrowSize: 11,
  titleSize: 32,
  subtitleSize: 12,
  ctaSize: 13,
  artSize: 101,
} as const;

export const pharmaciesFilter = {
  chipHeight: 36,
  chipRadius: 999,
  textSize: 14,
  gap: 8,
} as const;

export const pharmacyCard = {
  width: CONTENT_WIDTH,
  height: 281,
  radius: 24,
  stripHeight: 160,
  padding: 16,
  nameSize: 17,
  taglineSize: 13,
  addressSize: 12,
  ratingSize: 13,
  offerSize: 13,
  offerTagSize: 10,
  chipRadius: 6,
} as const;

/* ------------------------------- pharmacy -------------------------------- */

export const pharmacyHeader = {
  heroHeight: 132,
  barHeight: 36,
  cardTop: 66,
  cardHeight: 133,
  cardRadius: 24,
  cardPadding: 16,
  avatarSize: 56,
  avatarRadius: 16,
  nameSize: 22,
  taglineSize: 13,
  addressSize: 12,
  ratingSize: 15,
  statsSize: 12,
} as const;

export const pharmacyOfferStrip = {
  top: 198,
  cardHeight: 60,
  cardRadius: 16,
  iconSize: 36,
  iconRadius: 12,
  titleSize: 15,
  codeSize: 12,
  gap: 10,
} as const;

/* -------------------------------- shared --------------------------------- */

export const sectionHeading = {
  titleSize: 22,
  gap: 28,
  seeAllSize: 14,
} as const;

export const cardBadge = {
  size: 10,
  height: 18,
} as const;
