import { Pressable, StyleSheet, View } from 'react-native';

import { NamedIcon } from '@/components/icons';
import { Text } from '@/components/ui';
import { colors } from '@/theme';

import { homeQuickActions } from '../constants';

export interface QuickAction {
  id: string;
  label: string;
  /** Key into the icon registry. */
  icon: string;
}

export interface QuickActionTileProps {
  action: QuickAction;
  onPress?: (action: QuickAction) => void;
}

/**
 * One of the three shortcuts under the home search bar — a mint icon tile
 * with a two-line label.
 */
export function QuickActionTile({ action, onPress }: QuickActionTileProps) {
  return (
    <Pressable
      onPress={() => onPress?.(action)}
      accessibilityRole="button"
      accessibilityLabel={action.label}
      style={styles.tile}
    >
      <View style={styles.iconTile}>
        <NamedIcon
          name={action.icon}
          size={homeQuickActions.iconSize}
          color={colors.green700}
        />
      </View>
      <Text variant="caption" tone="primary" numberOfLines={2} style={styles.label}>
        {action.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: homeQuickActions.itemWidth,
    minHeight: homeQuickActions.itemHeight,
    alignItems: 'center',
  },
  iconTile: {
    width: homeQuickActions.iconTile,
    height: homeQuickActions.iconTile,
    borderRadius: homeQuickActions.iconTileRadius,
    backgroundColor: colors.mint100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginTop: 8,
    textAlign: 'center',
    minHeight: 32,
  },
});
