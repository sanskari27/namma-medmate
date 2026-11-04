import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GridIcon, UserIcon } from '@/components/icons';
import { Text } from '@/components/ui';
import { useAsyncData } from '@/hooks';
import { routes } from '@/navigation/routes';
import { catalogService } from '@/services';
import { useCartStore } from '@/store';
import { colors, gradients } from '@/theme';
import type { Category, Product } from '@/types';

import { BackButton, FilterChips, ProductImage, ProductTile } from '../components';
import { brandChips, categoryHeader, productGrid } from '../constants';
import {
  extractBrands,
  filterByBrand,
  filterProducts,
  type CatalogFilter,
} from '../hooks';

/**
 * 08 · Category — the browsable catalogue for one category.
 *
 * A coloured header with the category art, the horizontal category rail, the
 * filter and brand chips, and the two-column product grid.
 */
export function CategoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const categoryId = params.id ?? 'fever';
  const addLine = useCartStore((state) => state.addLine);

  const [filter, setFilter] = useState<CatalogFilter | 'popular'>('all');
  const [brand, setBrand] = useState<string | null>(null);

  const categories = useAsyncData<Category[]>(() => catalogService.fetchCategories(), []);
  const products = useAsyncData<Product[]>(
    () => catalogService.fetchProducts({ category: categoryId }),
    [categoryId],
  );

  const category = useMemo(
    () => (categories.data ?? []).find((c) => c.id === categoryId),
    [categories.data, categoryId],
  );

  const productList = useMemo(() => products.data ?? [], [products.data]);
  // The API knows the full category size; the grid only holds what it loaded.
  const totalProducts = category?.productCount ?? productList.length;
  const brands = useMemo(() => extractBrands(productList), [productList]);

  const visible = useMemo(() => {
    const all = productList;
    const base =
      filter === 'popular'
        ? [...all].sort(
            (a, b) =>
              (b.rating ?? 0) * (b.reviewCount ?? 0) -
              (a.rating ?? 0) * (a.reviewCount ?? 0),
          )
        : filterProducts(all, filter);
    return filterByBrand(base, brand);
  }, [productList, filter, brand]);

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
          style={[styles.header, { height: categoryHeader.height + insets.top }]}
        >
          <View style={[styles.headerRow, { paddingTop: 12 + insets.top }]}>
            <BackButton onPress={() => router.back()} />
            <Pressable
              onPress={() => router.push(routes.account)}
              accessibilityRole="button"
              accessibilityLabel="Your account"
              style={styles.accountButton}
            >
              <UserIcon size={18} color={colors.white} />
            </Pressable>
          </View>

          <View style={styles.headline}>
            <Text variant="eyebrow" tone="gold" style={styles.eyebrow}>
              Category
            </Text>
            <Text variant="h1" tone="inverse" style={styles.title} numberOfLines={2}>
              {category?.label ?? 'Medicines'}
            </Text>
            <Text variant="bodyS" tone="mint" style={styles.subtitle}>
              {totalProducts} products · choose the pharmacy at checkout
            </Text>
          </View>

          {category?.imageUrl ? (
            <View style={styles.art}>
              <CategoryArt url={category.imageUrl} label={category.label} />
            </View>
          ) : null}
        </LinearGradient>

        {/* --------------------------- CATEGORY RAIL --------------------------- */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.railContent}
          style={styles.rail}
        >
          {(categories.data ?? []).map((item) => (
            <Pressable
              key={item.id}
              onPress={() => router.push(routes.category(item.id))}
              accessibilityRole="button"
              accessibilityState={{ selected: item.id === categoryId }}
              style={styles.railTile}
            >
              <View
                style={[styles.railBox, item.id === categoryId && styles.railBoxSelected]}
              >
                <RailArt url={item.imageUrl} label={item.label} />
              </View>
              <Text
                variant="caption"
                tone={item.id === categoryId ? 'accentDeep' : 'primary'}
                numberOfLines={2}
                style={styles.railLabel}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* ------------------------------ FILTERS ------------------------------ */}
        <View style={styles.section}>
          <FilterChips
            options={[
              { id: 'popular', label: 'Popular' },
              { id: 'all', label: 'All' },
              { id: 'no-rx', label: 'No prescription' },
              { id: 'rx', label: 'Prescription' },
              { id: 'discount', label: '15% off and more' },
            ]}
            value={filter}
            onChange={(id) => {
              setFilter(id as CatalogFilter | 'popular');
              setBrand(null);
            }}
          />

          <View style={styles.brandRow}>
            <Text variant="caption" tone="muted" style={styles.brandLabel}>
              Brands
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.brandChips}
            >
              {brands.map((item) => {
                const selected = brand === item.name;
                return (
                  <Pressable
                    key={item.name}
                    onPress={() => setBrand(selected ? null : item.name)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={({ pressed }) => [
                      styles.brandChip,
                      selected && styles.brandChipSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text
                      variant="caption"
                      tone={selected ? 'accentDeep' : 'secondary'}
                      style={{ fontSize: brandChips.textSize }}
                    >
                      {item.name} ({item.count})
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* --------------------------- PRODUCT GRID --------------------------- */}
          <View style={styles.countRow}>
            <Text variant="caption" tone="muted">
              <Text variant="caption" tone="primary" style={styles.countValue}>
                {totalProducts}
              </Text>
              {' products'}
            </Text>

            <View style={styles.viewToggle}>
              <Pressable
                onPress={() => router.push(routes.search)}
                accessibilityRole="button"
                accessibilityLabel="Grid view"
                style={styles.toggleActive}
              >
                <GridIcon size={16} color={colors.green700} />
              </Pressable>
              <Pressable
                onPress={() => router.push(routes.search)}
                accessibilityRole="button"
                accessibilityLabel="List view"
                style={styles.toggleIdle}
              >
                <View style={styles.listIcon} />
              </Pressable>
            </View>
          </View>

          <View style={styles.grid}>
            {visible.map((product) => (
              <ProductTile
                key={product.id}
                product={product}
                onPress={openProduct}
                onAdd={addToCart}
              />
            ))}
          </View>

          <Pressable
            onPress={() => router.push(routes.search)}
            accessibilityRole="button"
            accessibilityLabel="Show more products"
            style={styles.showMore}
          >
            <Text variant="btnS" tone="accent">
              Show more products
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

/** The round category artwork in the coloured header. */
function CategoryArt({ url, label }: { url: string; label: string }) {
  return (
    <ProductImage
      url={url}
      brand={label}
      width={categoryHeader.artSize - 16}
      height={categoryHeader.artSize - 16}
      borderRadius={16}
    />
  );
}

/** The rail tile artwork — a mint block when the category has no photo. */
function RailArt({ url, label }: { url?: string; label: string }) {
  return (
    <ProductImage url={url} brand={label} width={64} height={64} borderRadius={16} />
  );
}

/* --------------------------------- styles --------------------------------- */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { paddingBottom: 40 },

  header: {
    height: categoryHeader.height,
    borderBottomLeftRadius: categoryHeader.bottomRadius,
    borderBottomRightRadius: categoryHeader.bottomRadius,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  accountButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headline: { paddingHorizontal: 16, marginTop: 18 },
  eyebrow: { textTransform: 'uppercase' },
  title: { fontSize: categoryHeader.titleSize, lineHeight: 36, marginTop: 2 },
  subtitle: { marginTop: 4, maxWidth: 262 },
  art: {
    position: 'absolute',
    right: 16,
    top: 66,
    width: categoryHeader.artSize,
    height: categoryHeader.artSize,
    borderRadius: categoryHeader.artRadius,
    backgroundColor: colors.mint100,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  artBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  artLabel: { textAlign: 'center' },

  rail: { marginTop: 12, marginHorizontal: -16 },
  railContent: { paddingHorizontal: 16, gap: 12 },
  railTile: { width: 64, alignItems: 'center' },
  railBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: colors.mint100,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  railBoxSelected: { borderWidth: 2, borderColor: colors.forest },
  railArt: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 4 },
  railArtLabel: { textAlign: 'center' },
  railLabel: { marginTop: 8, textAlign: 'center' },

  section: { paddingHorizontal: 16, marginTop: 20 },

  brandRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  brandLabel: { marginRight: 8 },
  brandChips: { gap: brandChips.gap, alignItems: 'center' },
  brandChip: {
    minHeight: brandChips.height,
    paddingHorizontal: 12,
    borderRadius: brandChips.radius,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandChipSelected: { backgroundColor: colors.mint100 },
  pressed: { opacity: 0.85 },

  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  countValue: { fontWeight: '700' },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface3,
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  toggleActive: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleIdle: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listIcon: {
    width: 14,
    height: 10,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.muted,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: productGrid.gap,
    marginTop: 14,
  },

  showMore: {
    alignSelf: 'center',
    minHeight: 40,
    marginTop: 16,
    paddingHorizontal: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
