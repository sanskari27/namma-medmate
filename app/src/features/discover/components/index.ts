/**
 * Discover feature — shared presentational pieces.
 *
 * Screens compose these; none of them reach into a store or a route.
 */

export { AddButton, PriceRow } from './PriceRow';
export type { AddButtonProps, PriceRowProps, PriceRowVariant } from './PriceRow';

export { DiscountBadge, RxBadge } from './Badges';

export { ProductImage } from './ProductImage';
export type { ProductImageProps } from './ProductImage';

export { SectionHeading } from './SectionHeading';
export type { SectionHeadingProps } from './SectionHeading';

export { CategoryGridTile, CategoryCircleTile } from './CategoryTile';
export { CategoryScroller } from './CategoryScroller';
export type { CategoryScrollerProps } from './CategoryScroller';

export { QuickActionTile } from './QuickActionTile';
export type { QuickAction, QuickActionTileProps } from './QuickActionTile';

export { TrustStrip } from './TrustStrip';

export { PromoBanner } from './PromoBanner';
export type { PromoBannerProps } from './PromoBanner';

export { ProductCard } from './ProductCard';
export type { ProductCardProps } from './ProductCard';

export { ProductTile } from './ProductTile';
export type { ProductTileProps } from './ProductTile';

export { FilterChips } from './FilterChips';
export type { FilterChipOption, FilterChipsProps } from './FilterChips';

export { BackButton, CircleAction, HeaderCircle, Monogram, TopBar } from './TopBar';
export type { TopBarProps } from './TopBar';

export { PharmacyMiniCard } from './PharmacyMiniCard';
export type { PharmacyMiniCardProps } from './PharmacyMiniCard';

export { PharmacyCard } from './PharmacyCard';
export type { PharmacyCardProps } from './PharmacyCard';

export { OfferStrip } from './OfferStrip';
export type { OfferItem, OfferStripProps } from './OfferStrip';
