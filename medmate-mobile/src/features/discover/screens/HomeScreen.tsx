import React, { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BellIcon,
  BoltIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FileUploadIcon,
  SearchIcon,
  UserIcon,
  WalletIcon,
} from '@/components/icons';
import { Text } from '@/components/ui';
import { useAsyncData } from '@/hooks';
import { routes } from '@/navigation/routes';
import { catalogService } from '@/services';
import { useCartStore } from '@/store';
import { colors, gradients } from '@/theme';
import type { Category, Pharmacy, Product } from '@/types';

import {
  CategoryGridTile,
  HeaderCircle,
  PharmacyMiniCard,
  ProductCard,
  ProductImage,
  PromoBanner,
  QuickActionTile,
  SectionHeading,
  TrustStrip,
  type QuickAction,
} from '../components';
import { homeHeader, homeLabsBanner, homeQuickActions } from '../constants';
import { pad, useFlashCountdown } from '../hooks';

/** The two product photos in the promo banner. */
const PROMO_ART = {
  box: 'https://medmate-india.netlify.app/products/hero-ab73.png',
  bottle: 'https://medmate-india.netlify.app/products/hero-ab78.png',
};

/**
 * 06 · Home — the Discover landing screen.
 *
 * Geometry measured off the live MVP at 390 × 844 (see `_ref/mvp/dom_home.json`):
 * a 468px green header, the 4-column category grid, and four horizontal rails.
 */
export function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const addLine = useCartStore((state) => state.addLine);
  const cartCount = useCartStore((state) => state.summary.itemCount);

  const categories = useAsyncData<Category[]>(() => catalogService.fetchCategories(), []);
  const pharmacies = useAsyncData<Pharmacy[]>(() => catalogService.fetchPharmacies(), []);
  const products = useAsyncData<Product[]>(() => catalogService.fetchProducts(), []);

  // Flash deals run for six hours from the first load of the session.
  const countdown = useFlashCountdown(6 * 60 * 60 * 1000);

  const categoryList = categories.data ?? [];
  const pharmacyList = pharmacies.data ?? [];

  const flashDeals = useMemo(
    () => (products.data ?? []).filter((p) => p.discountPercent >= 15).slice(0, 7),
    [products.data],
  );
  const trending = useMemo(
    () => (products.data ?? []).filter((p) => !p.requiresPrescription).slice(0, 3),
    [products.data],
  );
  const prescription = useMemo(
    () => (products.data ?? []).filter((p) => p.requiresPrescription).slice(0, 8),
    [products.data],
  );

  const openProduct = useCallback(
    (product: Product) => router.push(routes.product(product.id)),
    [router],
  );
  const openPharmacy = useCallback(
    (pharmacy: Pharmacy) => router.push(routes.pharmacy(pharmacy.id)),
    [router],
  );
  const openCategory = useCallback(
    (category: Category) => router.push(routes.category(category.id)),
    [router],
  );

  const quickActions: QuickAction[] = useMemo(
    () => [
      { id: 'upload-rx', label: 'Upload prescription', icon: 'upload' },
      { id: 'medicines', label: 'My medicines', icon: 'pill' },
      { id: 'offers', label: 'Offers & coupons', icon: 'percent' },
    ],
    [],
  );

  const addToCart = useCallback(
    (product: Product) => {
      const pharmacyId = product.pharmacyIds[0];
      if (!pharmacyId) return;
      addLine({ productId: product.id, quantity: 1, pharmacyId });
    },
    [addLine],
  );

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 32 + insets.bottom },
        ]}
      >
        {/* ------------------------------- HEADER ------------------------------ */}
        <LinearGradient
          colors={[gradients.brand.from, gradients.brand.to]}
          start={gradients.brand.start}
          end={gradients.brand.end}
          style={[styles.hero, { height: homeHeader.height + insets.top }]}
        >
          <View style={[styles.headerRow, { paddingTop: 12 + insets.top }]}>
            <Text variant="h1" tone="inverse" style={styles.wordmark}>
              Med
              <Text variant="h1" tone="gold">
                Mate
              </Text>
            </Text>

            <View style={styles.headerActions}>
              <Pressable
                onPress={() => router.push(routes.cart)}
                accessibilityRole="button"
                accessibilityLabel={`Cart, ${cartCount} items`}
                style={styles.cartPill}
              >
                <WalletIcon size={16} color={colors.gold} />
                <Text variant="btnS" tone="inverse">
                  {cartCount > 0 ? `₹${cartCount * 147}` : '₹180'}
                </Text>
              </Pressable>

              <HeaderCircle label="Notifications">
                <BellIcon size={18} color={colors.white} />
                <View style={styles.notificationDot} />
              </HeaderCircle>

              <HeaderCircle label="Your account" background={colors.gold}>
                <UserIcon size={18} color={colors.forest} />
              </HeaderCircle>
            </View>
          </View>

          <View style={styles.deliveryRow}>
            <View style={styles.boltBadge}>
              <BoltIcon size={12} color={colors.forest} />
            </View>
            <Text variant="h2" tone="inverse">
              Delivery in 12 minutes
            </Text>
          </View>

          <Pressable
            onPress={() => router.push(routes.location)}
            accessibilityRole="button"
            accessibilityLabel="Change delivery address"
            style={styles.addressRow}
          >
            <Text variant="caption" tone="inverse" style={styles.addressLabel}>
              Home
            </Text>
            <Text
              variant="caption"
              tone="mint"
              numberOfLines={1}
              style={styles.addressText}
            >
              {
                ' · 142, 7th Cross, Jayanagar 4th Block, near Cool Joint, Bengaluru 560011'
              }
            </Text>
            <ChevronDownIcon size={14} color={colors.mint200} />
          </Pressable>

          <Pressable
            onPress={() => router.push(routes.search)}
            accessibilityRole="search"
            accessibilityLabel="Search medicines"
            style={styles.searchBar}
          >
            <SearchIcon size={20} color={colors.ink} />
            <Text variant="body" tone="muted" style={styles.searchPlaceholder}>
              Search “Dolo 650”
            </Text>
            <Pressable
              onPress={() => router.push(routes.uploadPrescription)}
              accessibilityRole="button"
              accessibilityLabel="Upload prescription"
              style={styles.uploadRx}
            >
              <FileUploadIcon size={16} color={colors.green700} />
              <Text variant="btnS" tone="accentDeep">
                Upload Rx
              </Text>
            </Pressable>
          </Pressable>

          {/* ---------------------------- QUICK ACTIONS --------------------------- */}
          <View style={styles.quickActions}>
            {quickActions.map((action) => (
              <QuickActionTile key={action.id} action={action} />
            ))}
          </View>

          {/* ----------------------------- PROMO BANNER -------------------------- */}
          <View style={styles.promoSlot}>
            <PromoBanner
              eyebrow="First order · flat"
              title="25% OFF"
              subtitle="On your first medicine order"
              code="NAMMA25"
              cta="Order now"
              onCta={() => router.push(routes.offers)}
              onCode={() => router.push(routes.offers)}
              art={
                <View style={styles.promoArt}>
                  <ProductImage url={PROMO_ART.box} width={95} height={78} />
                  <ProductImage url={PROMO_ART.bottle} width={41} height={104} />
                </View>
              }
            />
          </View>
        </LinearGradient>

        {/* ------------------------------ TRUST STRIP --------------------------- */}
        <View style={styles.section}>
          <TrustStrip items={['100% genuine', 'Licensed stores', 'Rx verified']} />

          {/* --------------------------- CATEGORY GRID -------------------------- */}
          <View style={styles.headingSlot}>
            <SectionHeading title="Shop by " accent="category" />
          </View>

          <View style={styles.categoryGrid}>
            {categoryList.slice(0, 8).map((category) => (
              <CategoryGridTile
                key={category.id}
                category={category}
                onPress={openCategory}
              />
            ))}
          </View>

          <Pressable
            onPress={() => router.push(routes.category('fever'))}
            accessibilityRole="button"
            accessibilityLabel="See all 29 categories"
            style={styles.seeAllButton}
          >
            <Text variant="btnS" tone="primary">
              See all 29 categories
            </Text>
            <ChevronRightIcon size={16} color={colors.ink} />
          </Pressable>

          {/* ----------------------------- FLASH DEALS --------------------------- */}
          <View style={styles.headingSlot}>
            <View style={styles.flashHeading}>
              <View style={styles.flashBadge}>
                <BoltIcon size={14} color={colors.gold} />
              </View>
              <SectionHeading title="Flash " accent="deals" />
            </View>
          </View>

          <View style={styles.countdownRow}>
            <Text variant="caption" tone="secondary">
              Ends in
            </Text>
            {[countdown.hours, countdown.minutes, countdown.seconds].map(
              (value, index) => (
                <React.Fragment key={index}>
                  {index > 0 ? (
                    <Text
                      variant="caption"
                      tone="secondary"
                      style={styles.countdownColon}
                    >
                      :
                    </Text>
                  ) : null}
                  <View style={styles.countdownBox}>
                    <Text variant="micro" tone="inverse">
                      {pad(value)}
                    </Text>
                  </View>
                </React.Fragment>
              ),
            )}
          </View>

          <ProductRail products={flashDeals} onPress={openProduct} onAdd={addToCart} />

          {/* -------------------------- PHARMACIES NEAR YOU --------------------- */}
          <View style={styles.headingSlot}>
            <SectionHeading
              title="Pharmacies "
              accent="near you"
              onSeeAll={() => router.push(routes.pharmacies)}
            />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.railContent}
            style={styles.rail}
          >
            {pharmacyList.slice(0, 4).map((pharmacy) => (
              <PharmacyMiniCard
                key={pharmacy.id}
                pharmacy={pharmacy}
                offer={
                  pharmacy.id === 'hf'
                    ? 'Free delivery · no min'
                    : pharmacy.id === 'ss'
                      ? '20% OFF up to ₹100'
                      : pharmacy.id === 'lp'
                        ? 'Flat ₹50 off above ₹399'
                        : '15% OFF first order'
                }
                note={
                  pharmacy.id === 'hf'
                    ? '· Fastest'
                    : pharmacy.id === 'ss'
                      ? '· Open 24×7'
                      : pharmacy.id === 'lp'
                        ? '· Free delivery'
                        : '· Local favourite'
                }
                onPress={openPharmacy}
              />
            ))}
          </ScrollView>

          {/* ------------------------------ LAB TESTS ---------------------------- */}
          <LinearGradient
            colors={[gradients.art.from, gradients.art.to]}
            start={gradients.art.start}
            end={gradients.art.end}
            style={styles.labsBanner}
          >
            <View style={styles.labsCopy}>
              <Text variant="eyebrow" tone="accentDeep" style={styles.labsEyebrow}>
                Lab tests at home
              </Text>
              <Text variant="h2" tone="primary">
                Full body checkup at
              </Text>
              <Text variant="h2" tone="accentDeep">
                ₹599
              </Text>
              <Text variant="caption" tone="secondary" style={styles.labsSubtitle}>
                80+ tests · free home sample collection · reports in 24 h
              </Text>
              <Pressable
                onPress={() => router.push(routes.home)}
                accessibilityRole="button"
                accessibilityLabel="Book now"
                style={styles.labsCta}
              >
                <Text variant="btnS" tone="inverse">
                  Book now
                </Text>
              </Pressable>
            </View>
          </LinearGradient>

          {/* --------------------------- BEST OFFERS ---------------------------- */}
          <View style={styles.headingSlot}>
            <SectionHeading
              title="Best offers "
              accent="near you"
              onSeeAll={() => router.push(routes.offers)}
            />
          </View>

          <ProductRail products={trending} onPress={openProduct} onAdd={addToCart} />

          {/* ------------------------ PRESCRIPTION MEDICINES -------------------- */}
          <View style={styles.headingSlot}>
            <SectionHeading
              title="Prescription "
              accent="medicines"
              onSeeAll={() => router.push(routes.prescriptions)}
            />
          </View>

          <Text variant="caption" tone="secondary" style={styles.rxNote}>
            Rx items are dispensed only against a valid prescription, checked by a
            registered pharmacist.
          </Text>

          <ProductRail
            products={prescription}
            onPress={openProduct}
            onAdd={addToCart}
            tall
          />
        </View>
      </ScrollView>
    </View>
  );
}

/** The horizontal product rail shared by three home sections. */
function ProductRail({
  products,
  onPress,
  onAdd,
  tall,
}: {
  products: Product[];
  onPress: (product: Product) => void;
  onAdd: (product: Product) => void;
  tall?: boolean;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.railContent}
      style={styles.rail}
    >
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onPress={onPress}
          onAdd={onAdd}
          tall={tall}
        />
      ))}
    </ScrollView>
  );
}

/* --------------------------------- styles --------------------------------- */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.forest },
  scrollContent: { paddingBottom: 32 },

  hero: {
    height: homeHeader.height,
    borderBottomLeftRadius: homeHeader.bottomRadius,
    borderBottomRightRadius: homeHeader.bottomRadius,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  wordmark: { fontSize: homeHeader.wordmarkSize, lineHeight: 34, letterSpacing: -0.6 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cartPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: homeHeader.actionSize,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.red,
  },

  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    marginTop: 18,
  },
  boltBadge: {
    width: homeHeader.boltSize,
    height: homeHeader.boltSize,
    borderRadius: homeHeader.boltSize / 2,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },

  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 16,
  },
  addressLabel: { fontWeight: '700' },
  addressText: { flex: 1 },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: homeHeader.searchHeight,
    marginHorizontal: 16,
    marginTop: 20,
    paddingLeft: 14,
    paddingRight: 6,
    borderRadius: homeHeader.searchRadius,
    backgroundColor: colors.surface,
  },
  searchPlaceholder: { flex: 1 },
  uploadRx: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: homeHeader.uploadRxHeight,
    paddingHorizontal: 10,
    borderRadius: homeHeader.uploadRxRadius,
    backgroundColor: colors.mint100,
  },

  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: homeQuickActions.cardHeight,
    marginHorizontal: 16,
    marginTop: 12,
    paddingTop: 18,
    paddingHorizontal: 8,
    borderRadius: homeQuickActions.cardRadius,
    backgroundColor: colors.surface,
  },
  promoSlot: { marginHorizontal: 16, marginTop: 16 },
  promoArt: { flexDirection: 'row', alignItems: 'flex-end' },

  section: { paddingHorizontal: 16, paddingTop: 24 },

  headingSlot: { marginTop: 32 },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
    marginTop: 10,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'center',
    minHeight: 36,
    marginTop: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line2,
  },

  flashHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flashBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },

  countdownRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
  countdownBox: {
    minWidth: 26,
    height: 22,
    borderRadius: 6,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  countdownColon: { fontWeight: '700' },

  rail: { marginHorizontal: -16, marginTop: 12 },
  railContent: { paddingHorizontal: 16, gap: 12 },

  labsBanner: {
    height: homeLabsBanner.height,
    marginTop: 24,
    borderRadius: homeLabsBanner.radius,
    overflow: 'hidden',
  },
  labsCopy: { padding: 16, width: '70%' },
  labsEyebrow: { textTransform: 'uppercase', marginBottom: 4 },
  labsSubtitle: { marginTop: 10 },
  labsCta: {
    alignSelf: 'flex-start',
    minHeight: homeLabsBanner.ctaHeight,
    marginTop: 12,
    paddingHorizontal: 16,
    borderRadius: homeLabsBanner.ctaRadius,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rxNote: { marginTop: 10 },
});
