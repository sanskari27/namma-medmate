import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BagIcon, ChevronRightIcon, SearchIcon } from '@/components/icons';
import { Text } from '@/components/ui';
import { useAsyncData } from '@/hooks';
import { routes } from '@/navigation/routes';
import { catalogService } from '@/services';
import { useCartStore } from '@/store';
import { colors, gradients } from '@/theme';
import type { Offer, Pharmacy, Product } from '@/types';

import {
  FilterChips,
  Monogram,
  OfferStrip,
  ProductCard,
  SectionHeading,
} from '../components';
import { pharmacyHeader } from '../constants';

/**
 * 12 · Pharmacy — one store's profile, offers and bestsellers.
 */
export function PharmacyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const pharmacyId = params.id ?? '';
  const addLine = useCartStore((state) => state.addLine);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const pharmacy = useAsyncData<Pharmacy>(
    () => catalogService.fetchPharmacy(pharmacyId),
    [pharmacyId],
  );
  const products = useAsyncData<Product[]>(
    () => catalogService.fetchProducts({ pharmacyId }),
    [pharmacyId],
  );
  const couponOffers = useAsyncData<Offer[]>(() => catalogService.fetchOffers(), []);

  const store = pharmacy.data;

  const visible = useMemo(() => {
    const productList = products.data ?? [];
    const byText = query.trim()
      ? productList.filter((product) =>
          `${product.name} ${product.subtitle ?? ''}`
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
        )
      : productList;

    if (filter === 'no-rx') return byText.filter((p) => !p.requiresPrescription);
    if (filter === 'rx') return byText.filter((p) => p.requiresPrescription);
    if (filter === 'discount') return byText.filter((p) => p.discountPercent >= 15);
    return byText;
  }, [products.data, query, filter]);

  const addToCart = useCallback(
    (product: Product) => {
      addLine({ productId: product.id, quantity: 1, pharmacyId });
    },
    [addLine, pharmacyId],
  );

  if (!store) {
    return <View style={styles.root} />;
  }

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: 40 + insets.bottom }]}
      >
        {/* -------------------------------- HERO -------------------------------- */}
        <LinearGradient
          colors={[gradients.brand.from, gradients.brand.to]}
          start={gradients.brand.start}
          end={gradients.brand.end}
          style={[styles.hero, { height: pharmacyHeader.heroHeight + insets.top }]}
        >
          <View style={[styles.topBar, { paddingTop: 12 + insets.top }]}>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={styles.circleButton}
            >
              <ChevronRightIcon size={20} color={colors.white} style={styles.backIcon} />
            </Pressable>

            <View style={styles.topActions}>
              <Pressable
                onPress={() => router.push(routes.search)}
                accessibilityRole="button"
                accessibilityLabel="Search in this store"
                style={styles.circleButton}
              >
                <SearchIcon size={18} color={colors.white} />
              </Pressable>
              <Pressable
                onPress={() => router.push(routes.cart)}
                accessibilityRole="button"
                accessibilityLabel="Cart"
                style={styles.circleButton}
              >
                <BagIcon size={18} color={colors.white} />
              </Pressable>
            </View>
          </View>
        </LinearGradient>

        {/* ----------------------------- STORE CARD ----------------------------- */}
        <View style={styles.storeCard}>
          <View style={styles.storeHead}>
            <Monogram
              label={store.shortName}
              size={pharmacyHeader.avatarSize}
              radius={pharmacyHeader.avatarRadius}
              background={colors.forest}
              color={colors.gold}
              fontSize={20}
            />

            <View style={styles.storeCopy}>
              <Text
                variant="h1"
                tone="primary"
                numberOfLines={1}
                style={styles.storeName}
              >
                {store.name}
              </Text>
              <Text variant="bodyS" tone="secondary" numberOfLines={1}>
                {store.tagline}
              </Text>
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {store.address} · {store.distanceKm} km away
              </Text>
            </View>

            <View style={styles.ratingColumn}>
              <View style={styles.ratingBox}>
                <Text variant="btn" tone="inverse">
                  {store.rating.toFixed(1)}
                </Text>
              </View>
              {store.reviewCount ? (
                <Text variant="micro" tone="muted" style={styles.reviews}>
                  {store.reviewCount}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.stats}>
            <Text variant="caption" tone="secondary">
              delivery{' '}
              <Text variant="caption" tone="primary" style={styles.statStrong}>
                {store.deliveryMinutes} min
              </Text>
            </Text>
            <Text variant="caption" tone="secondary">
              {store.openUntil}
            </Text>
            <Text variant="caption" tone="secondary">
              <Text variant="caption" tone="accentDeep" style={styles.statStrong}>
                {store.freeDelivery ? 'Free delivery' : `₹${store.deliveryFee} delivery`}
              </Text>
            </Text>
          </View>
        </View>

        {/* ------------------------------- OFFERS ------------------------------- */}
        <View style={styles.offerSection}>
          <OfferStrip
            variant="pharmacy"
            offers={(couponOffers.data ?? []).map((offer, index) => ({
              id: offer.id,
              title: index === 0 ? 'Free delivery · no min' : offer.title,
              code: offer.code,
              icon: 'percent',
            }))}
          />
        </View>

        {/* ------------------------------- SEARCH ------------------------------- */}
        <View style={styles.searchSection}>
          <View style={styles.field}>
            <SearchIcon size={18} color={colors.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={`Search in ${store.name}`}
              placeholderTextColor={colors.muted}
              style={styles.input}
              accessibilityLabel="Search in this store"
            />
          </View>
        </View>

        {/* ------------------------------- FILTERS ------------------------------ */}
        <View style={styles.section}>
          <FilterChips
            options={[
              { id: 'all', label: 'All items' },
              { id: 'no-rx', label: 'No prescription' },
              { id: 'rx', label: 'Prescription' },
              { id: 'discount', label: '15% off and more' },
            ]}
            value={filter}
            onChange={setFilter}
            height={32}
          />

          <View style={styles.headingSlot}>
            <SectionHeading title="Bestsellers " accent="here" />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rail}
          >
            {visible.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onPress={(p) => router.push(routes.product(p.id))}
                onAdd={addToCart}
                tall
              />
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

/* --------------------------------- styles --------------------------------- */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { paddingBottom: 40 },

  hero: { height: pharmacyHeader.heroHeight },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  topActions: { flexDirection: 'row', gap: 8 },
  circleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { transform: [{ rotate: '180deg' }] },

  storeCard: {
    gap: 12,
    marginHorizontal: 16,
    // The MVP's store card overlaps the green hero by 66px.
    marginTop: -66,
    padding: pharmacyHeader.cardPadding,
    minHeight: pharmacyHeader.cardHeight,
    borderRadius: pharmacyHeader.cardRadius,
    backgroundColor: colors.surface,
    shadowColor: colors.ink,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  storeHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  storeCopy: { flex: 1 },
  storeName: { fontSize: pharmacyHeader.nameSize, lineHeight: 26 },
  ratingColumn: { alignItems: 'center' },
  ratingBox: {
    alignItems: 'center',
    backgroundColor: colors.green700,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  reviews: { marginTop: 3 },

  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  statStrong: { fontWeight: '700' },

  offerSection: { marginTop: 0 },

  searchSection: { marginTop: 18, paddingHorizontal: 16 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.surface2,
  },
  input: {
    flex: 1,
    padding: 0,
    color: colors.ink,
    fontFamily: 'Outfit-Medium',
    fontSize: 14,
    lineHeight: 20,
  },

  section: { paddingHorizontal: 16, marginTop: 20 },
  headingSlot: { marginTop: 24 },
  rail: {
    paddingRight: 16,
    gap: 12,
    marginTop: 12,
    marginHorizontal: -16,
    paddingLeft: 16,
  },
});
