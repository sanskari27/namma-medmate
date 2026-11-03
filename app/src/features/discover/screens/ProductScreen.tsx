import { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BagIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  InfoIcon,
  PackageIcon,
  SearchIcon,
  ShareIcon,
} from '@/components/icons';
import { Text } from '@/components/ui';
import { useAsyncData } from '@/hooks';
import { routes } from '@/navigation/routes';
import { catalogService } from '@/services';
import { useCartStore } from '@/store';
import { colors, gradients } from '@/theme';
import type { Offer, Pharmacy, PharmacyOffer, Product } from '@/types';
import { formatCurrency } from '@/utils';

import {
  DiscountBadge,
  Monogram,
  OfferStrip,
  ProductCard,
  ProductImage,
} from '../components';
import { productCtaBar, productDetail, productHeader } from '../constants';

/**
 * 09 · Product and 10 · Product · Rx.
 *
 * Both Figma frames are the same screen in two states — the Rx state is
 * driven by `requiresPrescription`, exactly as the MVP does it. The Rx state
 * adds the pack/form/storage facts, the prescription notice and the
 * Overview / How to use / Safety / FAQs tabs.
 */
export function ProductScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const productId = params.id ?? '';
  const addLine = useCartStore((state) => state.addLine);

  const product = useAsyncData<Product>(
    () => catalogService.fetchProduct(productId),
    [productId],
  );
  const offers = useAsyncData<PharmacyOffer[]>(
    () => catalogService.fetchProductOffers(productId),
    [productId],
  );
  const pharmacies = useAsyncData<Pharmacy[]>(() => catalogService.fetchPharmacies(), []);
  const couponOffers = useAsyncData<Offer[]>(() => catalogService.fetchOffers(), []);

  const item = product.data;
  const isRx = item?.requiresPrescription ?? false;

  const pharmacyById = useMemo(() => {
    const map = new Map<string, Pharmacy>();
    for (const pharmacy of pharmacies.data ?? []) map.set(pharmacy.id, pharmacy);
    return map;
  }, [pharmacies.data]);

  const storeList = useMemo(() => (offers.data ?? []).slice(0, 3), [offers.data]);
  const extraStores = Math.max(0, (offers.data?.length ?? 0) - storeList.length);
  const fastestMinutes = offers.data?.[0]?.deliveryMinutes ?? 0;

  const addToCart = useCallback(() => {
    if (!item) return;
    const pharmacyId = item.pharmacyIds[0];
    if (!pharmacyId) return;
    addLine({ productId: item.id, quantity: 1, pharmacyId });
  }, [addLine, item]);

  const similar = useAsyncData<Product[]>(
    () =>
      item
        ? catalogService.fetchProducts({ category: item.category })
        : Promise.resolve({ ok: true as const, data: [] }),
    [item?.category],
  );

  const similarProducts = useMemo(
    () => (similar.data ?? []).filter((p) => p.id !== productId).slice(0, 6),
    [similar.data, productId],
  );

  if (!item) {
    return <View style={styles.root} />;
  }

  const saving = item.mrp - item.sellingPrice;

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        // Leave room for the sticky "Add to cart" bar.
      >
        {/* -------------------------------- HERO -------------------------------- */}
        <LinearGradient
          colors={[gradients.art.from, gradients.art.to]}
          start={gradients.art.start}
          end={gradients.art.end}
          style={[styles.hero, { height: 300 + insets.top }]}
        >
          <View style={[styles.topBar, { paddingTop: 16 + insets.top }]}>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={styles.circleButton}
            >
              <ChevronRightIcon size={20} color={colors.ink} style={styles.backIcon} />
            </Pressable>

            <View style={styles.topActions}>
              <Pressable
                onPress={() => router.push(routes.search)}
                accessibilityRole="button"
                accessibilityLabel="Search"
                style={styles.circleButton}
              >
                <SearchIcon size={20} color={colors.ink} />
              </Pressable>
              <Pressable
                onPress={() => router.push(routes.home)}
                accessibilityRole="button"
                accessibilityLabel="Share"
                style={styles.circleButton}
              >
                <ShareIcon size={20} color={colors.ink} />
              </Pressable>
              <Pressable
                onPress={() => router.push(routes.cart)}
                accessibilityRole="button"
                accessibilityLabel="Cart"
                style={styles.circleButton}
              >
                <BagIcon size={20} color={colors.ink} />
              </Pressable>
            </View>
          </View>

          <View style={styles.gallery}>
            <ProductPhoto product={item} />
          </View>

          <View style={styles.heroFooter}>
            <DiscountBadge percent={item.discountPercent} />
            <View style={styles.thumbnails}>
              {[0, 1, 2].map((index) => (
                <View key={index} style={styles.thumb}>
                  <ProductThumb product={item} />
                </View>
              ))}
            </View>
          </View>
        </LinearGradient>

        {/* ------------------------------- TITLE -------------------------------- */}
        <View style={styles.body}>
          <Text variant="eyebrow" tone="accentDeep" numberOfLines={1}>
            {isRx
              ? `${item.manufacturer} · ${item.category.toUpperCase()}`
              : item.category.toUpperCase()}
          </Text>

          <Text variant="hero" tone="primary" style={styles.title}>
            {item.name}
          </Text>

          <Text variant="bodyS" tone="muted" style={styles.subtitle}>
            {item.subtitle ?? item.packSize}
          </Text>

          <View style={styles.tags}>
            {isRx ? (
              <View style={styles.tagRx}>
                <Text variant="tag" tone="danger">
                  Rx · prescription needed
                </Text>
              </View>
            ) : (
              <View style={styles.tagOk}>
                <Text variant="tag" tone="accentDeep">
                  No prescription needed
                </Text>
              </View>
            )}

            <View style={styles.tag}>
              <CheckCircleIcon size={12} color={colors.ink2} />
              <Text variant="tag" tone="secondary">
                Genuine
              </Text>
            </View>

            {(item.tags ?? []).map((tag) => (
              <View key={tag} style={styles.tagGold}>
                <Text variant="tag" tone="gold">
                  {tag}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.priceRow}>
            <Text variant="h1" tone="accentDeep" style={styles.price}>
              {formatCurrency(item.sellingPrice)}
            </Text>
            <Text variant="body" tone="muted" style={styles.mrp}>
              {formatCurrency(item.mrp)}
            </Text>
            <View style={styles.saving}>
              <Text variant="btnS" tone="accentDeep">
                You save {formatCurrency(saving)}
              </Text>
            </View>
          </View>

          <Text variant="caption" tone="muted">
            MRP inclusive of all taxes
          </Text>
        </View>

        {/* --------------------------- AVAILABILITY ---------------------------- */}
        <View style={styles.body}>
          <View style={styles.availability}>
            <View style={styles.availabilityIcon}>
              <PackageIcon size={18} color={colors.gold} />
            </View>
            <View style={styles.availabilityCopy}>
              <Text variant="title" tone="inverse">
                Available at {offers.data?.length ?? 0} pharmacies near you
              </Text>
              <Text variant="caption" tone="mint">
                Fastest in {fastestMinutes} min · choose the pharmacy at checkout
              </Text>
            </View>
          </View>

          <View style={styles.storesCard}>
            <Text variant="eyebrow" tone="accentDeep" style={styles.storesTitle}>
              Where to get it
            </Text>

            {storeList.map((offer) => {
              const pharmacy = pharmacyById.get(offer.pharmacyId);
              if (!pharmacy) return null;
              return (
                <Pressable
                  key={offer.pharmacyId}
                  onPress={() => router.push(routes.pharmacy(pharmacy.id))}
                  accessibilityRole="button"
                  accessibilityLabel={`${pharmacy.name}, ${formatCurrency(offer.price)}`}
                  style={styles.storeRow}
                >
                  <Monogram
                    label={pharmacy.shortName}
                    size={productDetail.storeAvatarSize}
                    radius={productDetail.storeAvatarRadius}
                  />
                  <View style={styles.storeCopy}>
                    <Text variant="title" tone="primary" numberOfLines={1}>
                      {pharmacy.name}
                    </Text>
                    <Text variant="caption" tone="muted" numberOfLines={1}>
                      {offer.deliveryMinutes} min ·{' '}
                      {offer.deliveryFee === 0
                        ? 'free delivery'
                        : `₹${offer.deliveryFee} delivery`}
                    </Text>
                  </View>
                  <Text variant="title" tone="primary">
                    {formatCurrency(offer.price)}
                  </Text>
                  <ChevronRightIcon size={16} color={colors.faint} />
                </Pressable>
              );
            })}
          </View>

          {extraStores > 0 ? (
            <Text variant="caption" tone="muted" style={styles.moreStores}>
              And {extraStores} more. Compare all at checkout.
            </Text>
          ) : null}
        </View>

        {/* ------------------------------ OFFERS ------------------------------- */}
        <View style={styles.offerSection}>
          <OfferStrip
            offers={(couponOffers.data ?? []).map((offer) => ({
              id: offer.id,
              title: offer.title,
              code: offer.code,
              icon: 'percent',
            }))}
          />
        </View>

        {/* ---------------------------- RX FACTS ------------------------------- */}
        {isRx ? (
          <View style={styles.body}>
            <View style={styles.factsRow}>
              <Fact label="Pack" value={item.pack ?? '—'} />
              <Fact label="Form" value={item.form ?? '—'} />
              <Fact label="Storage" value={item.storage ?? '—'} />
            </View>

            <View style={styles.rxNotice}>
              <View style={styles.rxNoticeIcon}>
                <InfoIcon size={20} color={colors.green700} />
              </View>
              <View style={styles.rxNoticeCopy}>
                <Text variant="title" tone="primary">
                  Prescription required
                </Text>
                <Text variant="caption" tone="secondary">
                  Order and pay first. A doctor then calls you to verify, free. Or upload
                  your prescription at checkout.
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* --------------------------- PRODUCT DETAILS ------------------------- */}
        <View style={styles.body}>
          <View style={styles.detailsHeading}>
            <View style={styles.detailsIcon}>
              <PackageIcon size={16} color={colors.green700} />
            </View>
            <Text variant="h3" tone="primary">
              Product details
            </Text>
          </View>

          <View style={styles.specs}>
            <Spec label="Composition" value={item.subtitle ?? item.packSize} />
            <Spec label="Category" value={item.category} />
            <Spec label="Prescription" value={isRx ? 'Required' : 'Not required'} />
            <Spec label="Marketed by" value={item.manufacturer} />
            <Spec label="MRP" value={formatCurrency(item.mrp)} />
          </View>
        </View>

        {/* ------------------------- HOW TO USE AND SAFETY --------------------- */}
        <View style={styles.body}>
          <Text variant="h3" tone="primary" style={styles.safetyTitle}>
            {isRx ? 'How to use' : 'How to use and safety'}
          </Text>
          <Text variant="bodyS" tone="secondary" style={styles.safetyBody}>
            Take exactly as directed by your physician. Do not exceed the recommended
            dose. Complete the full course even if you feel better. Keep out of reach of
            children and store in a cool, dry place away from sunlight.
          </Text>
        </View>

        {/* ---------------------------- SIMILAR ITEMS -------------------------- */}
        {similarProducts.length > 0 ? (
          <View style={styles.similarSection}>
            <View style={styles.similarHeading}>
              <Text variant="h1" tone="primary">
                Similar{' '}
                <Text variant="h1" tone="accent">
                  products
                </Text>
              </Text>
              <Pressable
                onPress={() => router.push(routes.category(item.category))}
                accessibilityRole="link"
                accessibilityLabel="See all similar products"
                style={styles.seeAll}
              >
                <Text variant="body" tone="accent">
                  See all
                </Text>
                <ChevronRightIcon size={16} color={colors.green} />
              </Pressable>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.similarRail}
            >
              {similarProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onPress={(p) => router.push(routes.product(p.id))}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.footer}>
          <Text variant="caption" tone="muted" align="center">
            Information here is for reference and does not replace medical advice.
          </Text>
        </View>
      </ScrollView>

      {/* ----------------------------- CTA BAR -------------------------------- */}
      <View style={[styles.ctaBar, { paddingBottom: 12 + insets.bottom }]}>
        <View style={styles.ctaPrice}>
          <Text variant="h1" tone="primary">
            {formatCurrency(item.sellingPrice)}
          </Text>
          <Text variant="caption" tone="muted">
            {formatCurrency(item.mrp)}
          </Text>
        </View>

        <Pressable
          onPress={addToCart}
          accessibilityRole="button"
          accessibilityLabel="Add to cart"
          style={({ pressed }) => [styles.ctaButton, pressed && styles.pressed]}
        >
          <BagIcon size={16} color={colors.white} />
          <Text variant="btn" tone="inverse">
            Add to cart
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/** The large gallery photo. */
function ProductPhoto({ product }: { product: Product }) {
  const source = product.imageUrl;
  return (
    <View style={styles.photoBox}>
      {source ? (
        <ProductImage url={source} brand={product.brand} width={310} height={188} />
      ) : (
        <View style={styles.photoFallback}>
          <Text variant="title" tone="mint">
            98%
          </Text>
          <Text variant="tag" tone="mint">
            {product.brand}
          </Text>
        </View>
      )}
    </View>
  );
}

/**
 * A single thumbnail.
 *
 * A product with no photography has no thumbnails either — the slot stays
 * empty rather than repeating the placeholder.
 */
function ProductThumb({ product }: { product: Product }) {
  if (!product.imageUrl) {
    return <View style={styles.thumbBlank} />;
  }

  return (
    <ProductImage
      url={product.imageUrl}
      brand={product.brand}
      width={40}
      height={40}
      borderRadius={8}
    />
  );
}

/** Pack / form / storage fact. */
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <PackageIcon size={18} color={colors.green700} />
      <Text variant="caption" tone="muted">
        {label}
      </Text>
      <Text variant="title" tone="primary" numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

/** One row of the specification table. */
function Spec({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.specRow}>
      <Text variant="body" tone="muted" style={styles.specLabel}>
        {label}
      </Text>
      <Text variant="body" tone="primary" style={styles.specValue}>
        {value}
      </Text>
    </View>
  );
}

/* --------------------------------- styles --------------------------------- */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { paddingBottom: 120 },

  hero: { height: 300 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  topActions: { flexDirection: 'row', gap: 8 },
  circleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.ink,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  backIcon: { transform: [{ rotate: '180deg' }] },

  gallery: { alignItems: 'center', marginTop: 4 },
  photoBox: { width: 310, height: 188, alignItems: 'center', justifyContent: 'center' },
  photoFallback: {
    width: 154,
    height: 134,
    borderRadius: 8,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 0,
  },
  thumbnails: { flexDirection: 'row', gap: productHeader.thumbGap },
  thumbBlank: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.surface3,
  },
  thumb: {
    width: productHeader.thumbSize,
    height: productHeader.thumbSize,
    borderRadius: productHeader.thumbRadius,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  body: { paddingHorizontal: 16, paddingTop: 18 },
  title: { fontSize: productDetail.titleSize, lineHeight: 28, marginTop: 6 },
  subtitle: { marginTop: 6 },

  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  tagOk: {
    backgroundColor: colors.mint100,
    borderRadius: productDetail.tagRadius,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagRx: {
    backgroundColor: colors.redBg,
    borderRadius: productDetail.tagRadius,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface2,
    borderRadius: productDetail.tagRadius,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagGold: {
    backgroundColor: colors.gold50,
    borderRadius: productDetail.tagRadius,
    borderWidth: 1,
    borderColor: colors.gold,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },

  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  price: { fontSize: productDetail.priceSize, lineHeight: 38 },
  mrp: { textDecorationLine: 'line-through' },
  saving: {
    backgroundColor: colors.mint100,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },

  availability: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: productDetail.availabilityHeight,
    paddingHorizontal: 12,
    borderRadius: productDetail.availabilityRadius,
    backgroundColor: colors.forest,
  },
  availabilityIcon: {
    width: productDetail.availabilityIconTile,
    height: productDetail.availabilityIconTile,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  availabilityCopy: { flex: 1 },

  storesCard: {
    marginTop: 18,
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 8,
    borderRadius: productDetail.storesRadius,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  storesTitle: { textTransform: 'uppercase' },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: productDetail.storeRowHeight,
    marginTop: 10,
  },
  storeCopy: { flex: 1 },
  moreStores: { marginTop: 8 },

  offerSection: { marginTop: 20 },

  factsRow: { flexDirection: 'row', gap: 12 },
  fact: { flex: 1, gap: 4 },
  rxNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 18,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: colors.gold50,
  },
  rxNoticeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rxNoticeCopy: { flex: 1, gap: 2 },

  detailsHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailsIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.mint100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  specs: { marginTop: 12 },
  specRow: { flexDirection: 'row', paddingVertical: 10 },
  specLabel: { width: 128 },
  specValue: { flex: 1 },

  safetyTitle: { marginBottom: 8 },
  safetyBody: { lineHeight: 20 },

  similarSection: { marginTop: 24, paddingLeft: 16 },
  similarHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  similarRail: { paddingRight: 16, gap: 12, marginTop: 12 },

  footer: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 12 },

  ctaBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: productCtaBar.height,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderTopLeftRadius: productCtaBar.radius,
    borderTopRightRadius: productCtaBar.radius,
    backgroundColor: colors.surface,
    shadowColor: colors.ink,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
    elevation: 12,
  },
  ctaPrice: { width: 55 },
  ctaButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: productCtaBar.buttonHeight,
    borderRadius: productCtaBar.buttonRadius,
    backgroundColor: colors.green,
  },
  pressed: { opacity: 0.9 },
});
