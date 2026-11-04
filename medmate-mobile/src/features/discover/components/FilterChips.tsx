import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Text } from '@/components/ui';
import { colors } from '@/theme';

import { filterChips } from '../constants';

export interface FilterChipOption {
  id: string;
  label: string;
}

export interface FilterChipsProps {
  options: FilterChipOption[];
  value: string;
  onChange: (id: string) => void;
  /** Compact variant for the pharmacy screen's filter row. */
  height?: number;
  textSize?: number;
}

/**
 * The pill row of filters.
 *
 * The selected chip is filled with the brand green; the rest are outlined.
 * The row scrolls horizontally so it never clips the last option.
 */
export function FilterChips({
  options,
  value,
  onChange,
  height = filterChips.height,
  textSize = filterChips.textSize,
}: FilterChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      style={styles.root}
    >
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <Pressable
            key={option.id}
            onPress={() => onChange(option.id)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.chip,
              { minHeight: height, borderRadius: filterChips.radius },
              selected ? styles.chipSelected : styles.chipIdle,
              pressed && styles.pressed,
            ]}
          >
            <Text
              variant="body"
              tone={selected ? 'inverse' : 'secondary'}
              style={{ fontSize: textSize }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { marginHorizontal: -16 },
  content: { paddingHorizontal: 16, gap: filterChips.gap, alignItems: 'center' },
  chip: {
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: colors.forest },
  chipIdle: { borderWidth: 1, borderColor: colors.line2 },
  pressed: { opacity: 0.85 },
});
