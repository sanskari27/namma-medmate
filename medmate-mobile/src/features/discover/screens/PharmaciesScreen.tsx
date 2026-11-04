import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChevronRightIcon, SearchIcon, UserIcon } from '@/components/icons';
import { Text } from '@/components/ui';
import { useAsyncData } from '@/hooks';
import { routes } from '@/navigation/routes';
import { catalogService } from '@/services';
import { colors, gradients } from '@/theme';
import type { Category, Pharmacy } from '@/types';

import {
  CategoryScroller,
  PharmacyCard,
  ProductImage,
  SectionHeading,
} from '../components';
import { pharmaciesFilter, pharmaciesHeader, promoCarousel } from '../constants';

/**
 * 11 · Pharmacies near you.
 *
 * A coloured header with the delivery address and a search field, a promo
 * carousel, the category scroller, filter chips and the store list.
 */
export function PharmaciesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  // `null` means "no filter" — the MVP's "Sort" chip is a sort control and is
  // never highlighted.
  const [filter, setFilter] = useState<string | null>(null);

  const categories = useAsyncData<Category[]>(() => catalogService.fetchCategories(), []);
  const pharmacies = useAsyncData<Pharmacy[]>(() => catalogService.fetchPharmacies(), []);

  const storeList = useMemo(() => pharmacies.data ?? [], [pharmacies.data]);

  const visible = useMemo(() => {
    const byText = query.trim()
      ? storeList.filter((pharmacy) =>
          `${pharmacy.name} ${pharmacy.tagline} ${pharmacy.address}`
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
        )
      : storeList;

    switch (filter) {
      case null:
        return byText;
      case 'open':
        return byText.filter(
          (p) => p.openUntil?.includes('24×7') || p.deliveryMinutes <= 22,
        );
      case 'fast':
        return byText.filter((p) => p.deliveryMinutes <= 20);
      case 'rated':
        return byText.filter((p) => p.rating >= 4.5);
      case 'free':
        return byText.filter((p) => p.freeDelivery);
      case 'always':
        return byText.filter((p) => p.openUntil?.includes('24×7'));
      default:
        return byText;
    }
  }, [storeList, query, filter]);

  const openPharmacy = useCallback(
    (pharmacy: Pharmacy) => router.push(routes.pharmacy(pharmacy.id)),
    [router],
  );

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: 40 + insets.bottom }]}
      >
        {/* ------------------------------- HEADER ------------------------------ */}
        <LinearGradient
          colors={[gradients.brand.from, gradients.brand.to]}
          start={gradients.brand.start}
          end={gradients.brand.end}
          style={[styles.header, { height: pharmaciesHeader.height + insets.top }]}
        >
          <View style={[styles.headerRow, { paddingTop: 12 + insets.top }]}>
            <View style={styles.addressBlock}>
              <Text variant="title" tone="inverse">
                Home
              </Text>
              <Text variant="caption" tone="mint" numberOfLines={1}>
                142, 7th Cross, Jayanagar 4th Block, near Cool Joint, Bengaluru 560011
              </Text>
            </View>

            <Pressable
              onPress={() => router.push(routes.account)}
              accessibilityRole="button"
              accessibilityLabel="Your account"
              style={styles.avatar}
            >
              <UserIcon size={18} color={colors.forest} />
            </Pressable>
          </View>

          <Text variant="h2" tone="inverse" style={styles.title}>
            Pharmacies{' '}
            <Text variant="h2" tone="gold">
              near you
            </Text>
          </Text>

          <Text variant="bodyS" tone="mint" style={styles.subtitle}>
            {storeList.length} licensed stores delivering now · fastest in 12 min
          </Text>

          <View style={styles.field}>
            <SearchIcon size={20} color={colors.ink} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search pharmacies, specialities…"
              placeholderTextColor={colors.muted}
              style={styles.input}
              accessibilityLabel="Search pharmacies"
            />
          </View>
        </LinearGradient>

        {/* ---------------------------- PROMO CAROUSEL -------------------------- */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carousel}
          style={styles.carouselRoot}
        >
          <PromoCard
            variant="forest"
            eyebrow="Deal of the day"
            title="20% OFF"
            subtitle="up to ₹100 at Sri Sai Medicals"
            artUrl={PROMO_ART.deal}
          />
          <PromoCard
            variant="gold"
            eyebrow="No minimum order"
            title="Free delivery"
            subtitle="from HealthFirst Chemist · 12 min"
            artUrl={PROMO_ART.delivery}
          />
          <PromoCard
            variant="plain"
            eyebrow="Top rated near you"
            title="4.8 ★ rated"
            subtitle="Namma Arogya Pharmacy"
            artUrl={PROMO_ART.rated}
          />
        </ScrollView>

        {/* --------------------------- CATEGORY SCROLLER ----------------------- */}
        <View style={styles.section}>
          <SectionHeading title="What do you " accent="need today?" />

          <CategoryScroller
            categories={categories.data ?? []}
            onSelect={(category) => router.push(routes.category(category.id))}
          />

          {/* ------------------------------ FILTERS ----------------------------- */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filters}
            style={styles.filterRoot}
          >
            {[
              { id: 'sort', label: 'Sort' },
              { id: 'open', label: 'Open now' },
              { id: 'fast', label: 'Under 20 min' },
              { id: 'rated', label: 'Rating 4.5+' },
              { id: 'free', label: 'Free delivery' },
              { id: 'always', label: '24×7' },
            ].map((option) => {
              const selected = filter === option.id;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => setFilter(option.id === 'sort' ? null : option.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={({ pressed }) => [
                    styles.filterChip,
                    selected && styles.filterChipSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text variant="body" tone={selected ? 'inverse' : 'secondary'}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text variant="micro" tone="muted" style={styles.count}>
            {visible.length} pharmacies delivering to you
          </Text>

          {/* ------------------------------ STORES ------------------------------ */}
          <View style={styles.list}>
            {visible.map((pharmacy) => (
              <PharmacyCard
                key={pharmacy.id}
                pharmacy={pharmacy}
                offer={storeOffer(pharmacy.id)}
                highlights={storeHighlights(pharmacy)}
                onPress={openPharmacy}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/** The three promotional cards above the store list. */
const PROMO_ART = {
  deal: 'https://medmate-india.netlify.app/products/hero-ab73.png',
  delivery: 'https://medmate-india.netlify.app/products/hero-ab78.png',
  rated: 'https://medmate-india.netlify.app/products/ab73.png',
};

function PromoCard({
  variant,
  eyebrow,
  title,
  subtitle,
  artUrl,
}: {
  variant: 'forest' | 'gold' | 'plain';
  eyebrow: string;
  title: string;
  subtitle: string;
  artUrl: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      style={({ pressed }) => [
        styles.promoCard,
        variant === 'forest' && styles.promoForest,
        variant === 'gold' && styles.promoGold,
        variant === 'plain' && styles.promoPlain,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.promoCopy}>
        <Text variant="micro" tone={variant === 'forest' ? 'gold' : 'accentDeep'}>
          {eyebrow}
        </Text>
        <Text
          variant="h1"
          tone={variant === 'forest' ? 'inverse' : 'primary'}
          style={styles.promoTitle}
          numberOfLines={1}
        >
          {title}
        </Text>
        <Text
          variant="caption"
          tone={variant === 'forest' ? 'inverse' : 'secondary'}
          numberOfLines={2}
        >
          {subtitle}
        </Text>
        <View style={styles.promoCta}>
          <Text variant="btnS" tone={variant === 'forest' ? 'inverse' : 'primary'}>
            Order now
          </Text>
          <ChevronRightIcon
            size={14}
            color={variant === 'forest' ? colors.white : colors.ink}
          />
        </View>
      </View>

      <View style={styles.promoArt}>
        <ProductImage
          url={artUrl}
          width={promoCarousel.artSize}
          height={promoCarousel.artSize}
        />
      </View>
    </Pressable>
  );
}

/** The headline offer ribbon on a store card. */
function storeOffer(id: string): string | undefined {
  switch (id) {
    case 'hf':
      return 'Free delivery · no min';
    case 'ss':
      return '20% OFF up to ₹100';
    case 'lp':
      return 'Flat ₹50 off above ₹399';
    case 'jm':
      return '15% OFF first order';
    case 'na':
      return 'Free delivery above ₹149';
    case 'cc':
      return '10% OFF on devices';
    default:
      return '10% OFF on generics';
  }
}

/** The bottom-row highlights on a store card. */
function storeHighlights(pharmacy: Pharmacy): string[] {
  const highlights: string[] = [];
  if (pharmacy.freeDelivery) highlights.push('Free delivery');
  if (pharmacy.openUntil?.includes('24×7')) highlights.push('Open 24×7');
  else highlights.push('Rx accepted');
  return highlights;
}

/* --------------------------------- styles --------------------------------- */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { paddingBottom: 40 },

  header: {
    height: pharmaciesHeader.height,
    borderBottomLeftRadius: pharmaciesHeader.bottomRadius,
    borderBottomRightRadius: pharmaciesHeader.bottomRadius,
    overflow: 'hidden',
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  addressBlock: { flex: 1, paddingRight: 12 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { marginTop: 12 },
  subtitle: { marginTop: 4 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: pharmaciesHeader.fieldHeight,
    marginTop: 18,
    paddingHorizontal: 14,
    borderRadius: pharmaciesHeader.fieldRadius,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    padding: 0,
    color: colors.ink,
    fontFamily: 'Outfit-Medium',
    fontSize: 14,
    lineHeight: 20,
  },

  // The MVP's carousel starts 2px above the header's bottom edge.
  carouselRoot: { marginTop: -2, marginHorizontal: -16 },
  carousel: { paddingHorizontal: 16, gap: promoCarousel.gap },
  promoCard: {
    width: promoCarousel.cardWidth,
    height: promoCarousel.cardHeight,
    borderRadius: promoCarousel.cardRadius,
    padding: 16,
    justifyContent: 'space-between',
  },
  promoForest: { backgroundColor: colors.forest },
  promoGold: {
    backgroundColor: colors.gold50,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  promoPlain: { backgroundColor: colors.surface2 },
  promoCopy: { flex: 1, paddingRight: 96 },
  promoArt: {
    position: 'absolute',
    right: 12,
    top: 15,
    width: promoCarousel.artSize,
    height: promoCarousel.artSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoTitle: { fontSize: promoCarousel.titleSize, lineHeight: 36, marginTop: 4 },
  promoCta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  pressed: { opacity: 0.9 },

  section: { paddingHorizontal: 16, marginTop: 16 },
  filterRoot: { marginHorizontal: -16, marginTop: 20 },
  filters: { paddingHorizontal: 16, gap: pharmaciesFilter.gap, alignItems: 'center' },
  filterChip: {
    minHeight: pharmaciesFilter.chipHeight,
    paddingHorizontal: 14,
    borderRadius: pharmaciesFilter.chipRadius,
    borderWidth: 1,
    borderColor: colors.line2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipSelected: { backgroundColor: colors.forest, borderColor: colors.forest },

  count: { marginTop: 16, textTransform: 'uppercase' },
  list: { gap: 16, marginTop: 14 },
});
