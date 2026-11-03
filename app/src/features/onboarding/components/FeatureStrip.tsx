import React from 'react';
import { StyleSheet, View } from 'react-native';

import { BoltIcon, ShieldCheckIcon, StethoscopeIcon } from '@/components/icons';
import { Text } from '@/components/ui';
import { colors, overlays } from '@/theme';

import { LOGIN } from '../constants';

const ITEMS = [
  { Icon: BoltIcon, label: 'Delivery\nin minutes' },
  { Icon: ShieldCheckIcon, label: 'Licensed\npharmacies' },
  { Icon: StethoscopeIcon, label: 'Free doctor\nconsult' },
];

/**
 * The three-value strip on the Login hero.
 *
 * "Delivery in minutes · Licensed pharmacies · Free doctor consult".
 */
export function FeatureStrip() {
  return (
    <View style={styles.strip}>
      {ITEMS.map(({ Icon, label }, index) => (
        <React.Fragment key={label}>
          {index > 0 ? <View style={styles.divider} /> : null}

          <View style={styles.item}>
            <Icon size={18} color={colors.gold} />
            <Text variant="micro" tone="inverse" align="center" style={styles.label}>
              {label}
            </Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    marginTop: LOGIN.featureStrip.marginTop,
    width: LOGIN.featureStrip.width,
    height: LOGIN.featureStrip.height,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: LOGIN.featureStrip.radius,
    borderWidth: 1,
    borderColor: overlays.white10,
    backgroundColor: overlays.white07,
    overflow: 'hidden',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: LOGIN.featureStrip.itemPaddingVertical,
  },
  divider: {
    width: LOGIN.featureStrip.dividerWidth,
    height: LOGIN.featureStrip.dividerHeight,
    backgroundColor: overlays.white10,
  },
  label: { marginTop: LOGIN.featureStrip.labelMarginTop },
});
