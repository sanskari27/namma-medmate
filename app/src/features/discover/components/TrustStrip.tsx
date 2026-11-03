import { StyleSheet, View } from 'react-native';

import { ShieldCheckIcon } from '@/components/icons';
import { Text } from '@/components/ui';
import { colors } from '@/theme';

import { homeTrustStrip } from '../constants';

/**
 * The three reassurance points under the home promo banner:
 * "100% genuine · Licensed stores · Rx verified".
 */
export function TrustStrip({ items }: { items: string[] }) {
  return (
    <View style={styles.strip}>
      {items.map((label) => (
        <View key={label} style={styles.item}>
          <ShieldCheckIcon size={homeTrustStrip.iconSize} color={colors.green700} />
          <Text variant="caption" tone="secondary" numberOfLines={1}>
            {label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: homeTrustStrip.height,
    paddingHorizontal: 15,
    backgroundColor: colors.mint50,
    borderRadius: homeTrustStrip.radius,
    borderWidth: 1,
    borderColor: colors.line,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
