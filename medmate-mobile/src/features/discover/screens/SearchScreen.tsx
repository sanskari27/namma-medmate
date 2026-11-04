import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FileUploadIcon, SearchIcon, SlidersIcon } from '@/components/icons';
import { Text } from '@/components/ui';
import { useAsyncData } from '@/hooks';
import { routes } from '@/navigation/routes';
import { catalogService } from '@/services';
import { useCartStore } from '@/store';
import { colors, gradients } from '@/theme';
import type { Category, Product } from '@/types';

import { BackButton, CategoryScroller, ProductCard, SectionHeading } from '../components';
import { popularSearches, searchHeader } from '../constants';

/**
 * 07 · Search — popular searches, the category scroller and trending stock.
 *
 * Geometry measured off the live MVP (see `_ref/mvp/dom_search.json`).
 */
export function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const addLine = useCartStore((state) => state.addLine);
  const [query, setQuery] = useState('');

  const categories = useAsyncData<Category[]>(() => catalogService.fetchCategories(), []);
  const products = useAsyncData<Product[]>(() => catalogService.fetchProducts(), []);

  const categoryList = categories.data ?? [];

  const trending = useMemo(() => (products.data ?? []).slice(0, 6), [products.data]);

  const openProduct = useCallback(
    (product: Product) => router.push(routes.product(product.id)),
    [router],
  );

  const addToCart = useCallback(
    (product: Product) => {
      const pharmacyId = product.pharmacyIds[0];
      if (!pharmacyId) return;
      addLine({ productId: product.id, quantity: 1, pharmacyId });
    },
    [addLine],
  );

  const suggestions = [
    'Paracetamol',
    'Dolo 650',
    'Pain relief',
    'Amoxyclav',
    'Vitamin',
    'Cough',
    'Diabetes',
    'Ayurveda',
  ];

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: 32 + insets.bottom }]}
      >
        {/* ------------------------------- HEADER ------------------------------ */}
        <LinearGradient
          colors={[gradients.brand.from, gradients.brand.to]}
          start={gradients.brand.start}
          end={gradients.brand.end}
          style={[styles.header, { height: searchHeader.height + insets.top }]}
        >
          <View style={[styles.headerRow, { paddingTop: 12 + insets.top }]}>
            <BackButton onPress={() => router.back()} />

            <View style={styles.field}>
              <SearchIcon size={18} color={colors.ink} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search medicines, brands…"
                placeholderTextColor={colors.muted}
                style={styles.input}
                returnKeyType="search"
                accessibilityLabel="Search medicines"
              />
            </View>

            <Pressable
              onPress={() => router.push(routes.category('fever'))}
              accessibilityRole="button"
              accessibilityLabel="Filter products"
              style={styles.filterButton}
            >
              <SlidersIcon size={20} color={colors.forest} />
            </Pressable>
          </View>
        </LinearGradient>

        {/* --------------------------- POPULAR SEARCHES ------------------------ */}
        <View style={styles.section}>
          <SectionHeading title="Popular " accent="searches" />

          <View style={styles.chips}>
            {suggestions.map((suggestion) => (
              <Pressable
                key={suggestion}
                onPress={() => setQuery(suggestion)}
                accessibilityRole="button"
                accessibilityLabel={`Search for ${suggestion}`}
                style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
              >
                <SearchIcon size={popularSearches.iconSize} color={colors.green700} />
                <Text variant="body" tone="primary">
                  {suggestion}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* ------------------------ BROWSE BY CATEGORY ------------------------ */}
          <View style={styles.headingSlot}>
            <SectionHeading title="Browse by " accent="category" />
          </View>

          <CategoryScroller
            categories={categoryList}
            onSelect={(category) => router.push(routes.category(category.id))}
          />

          {/* --------------------------- TRENDING NEAR YOU ---------------------- */}
          <View style={styles.headingSlot}>
            <SectionHeading title="Trending " accent="near you" />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.railContent}
            style={styles.rail}
          >
            {trending.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onPress={openProduct}
                onAdd={addToCart}
                tall
              />
            ))}
          </ScrollView>

          {/* ------------------------- PRESCRIPTION PROMPT ---------------------- */}
          <Pressable
            onPress={() => router.push(routes.uploadPrescription)}
            accessibilityRole="button"
            accessibilityLabel="Upload a prescription"
            style={styles.rxPrompt}
          >
            <View style={styles.rxIcon}>
              <FileUploadIcon size={20} color={colors.gold} />
            </View>
            <View style={styles.rxCopy}>
              <Text variant="title" tone="inverse">
                Have a prescription?
              </Text>
              <Text variant="caption" tone="mint" style={styles.rxBody}>
                Upload it and a nearby pharmacy sends the medicine to your door.
              </Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

/* --------------------------------- styles --------------------------------- */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { paddingBottom: 32 },

  header: {
    height: searchHeader.height,
    borderBottomLeftRadius: searchHeader.bottomRadius,
    borderBottomRightRadius: searchHeader.bottomRadius,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: searchHeader.fieldHeight,
    paddingHorizontal: 14,
    borderRadius: searchHeader.fieldRadius,
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
  filterButton: {
    width: searchHeader.filterSize,
    height: searchHeader.filterSize,
    borderRadius: searchHeader.filterRadius,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },

  section: { paddingHorizontal: 16, paddingTop: 20 },
  headingSlot: { marginTop: 24 },

  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: popularSearches.chipGap,
    marginTop: 14,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: popularSearches.chipHeight,
    paddingHorizontal: 14,
    borderRadius: popularSearches.chipRadius,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.85 },

  rail: { marginHorizontal: -16, marginTop: 12 },
  railContent: { paddingHorizontal: 16, gap: 12 },

  rxPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 92,
    marginTop: 24,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: colors.forest,
  },
  rxIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rxCopy: { flex: 1 },
  rxBody: { marginTop: 4 },
});
