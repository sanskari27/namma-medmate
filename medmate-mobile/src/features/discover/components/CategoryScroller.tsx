import { ScrollView, StyleSheet } from 'react-native';

import type { Category } from '@/types';

import { categoryScroller } from '../constants';

import { CategoryCircleTile } from './CategoryTile';

export interface CategoryScrollerProps {
  categories: Category[];
  onSelect?: (category: Category) => void;
}

/**
 * The horizontal row of circular category tiles.
 *
 * Used on the search and pharmacies screens. The MVP lets the row bleed to
 * the screen edges, so the content inset lives on the items rather than the
 * scroll view.
 */
export function CategoryScroller({ categories, onSelect }: CategoryScrollerProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      style={styles.root}
    >
      {categories.map((category) => (
        <CategoryCircleTile key={category.id} category={category} onPress={onSelect} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { marginHorizontal: -16 },
  content: {
    paddingHorizontal: 16,
    gap: categoryScroller.gap,
  },
});
