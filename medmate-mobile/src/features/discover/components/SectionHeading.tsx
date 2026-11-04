import { Pressable, StyleSheet, View } from 'react-native';

import { ChevronRightIcon } from '@/components/icons';
import { Text } from '@/components/ui';
import { colors } from '@/theme';

import { sectionHeading } from '../constants';

export interface SectionHeadingProps {
  title: string;
  /** Rendered in green straight after the title. */
  accent?: string;
  /** Optional trailing "See all" link. */
  onSeeAll?: () => void;
  seeAllLabel?: string;
}

/**
 * The `22px/700` section title used across the app, with the green accent
 * word and the optional "See all" affordance on the right.
 */
export function SectionHeading({
  title,
  accent,
  onSeeAll,
  seeAllLabel = 'See all',
}: SectionHeadingProps) {
  return (
    <View style={styles.row}>
      <Text variant="h1" tone="primary" style={styles.title} numberOfLines={1}>
        {title}
        {accent ? (
          <Text variant="h1" tone="accent">
            {accent}
          </Text>
        ) : null}
      </Text>

      {onSeeAll ? (
        <Pressable
          onPress={onSeeAll}
          accessibilityRole="link"
          accessibilityLabel={seeAllLabel}
          style={styles.seeAll}
        >
          <Text variant="body" tone="accent">
            {seeAllLabel}
          </Text>
          <ChevronRightIcon size={16} color={colors.green} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 26,
  },
  title: { fontSize: sectionHeading.titleSize, lineHeight: 26, flexShrink: 1 },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingLeft: 8 },
});
