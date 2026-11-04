import { Pressable, StyleSheet, View } from 'react-native';

import { EditIcon, HomeIcon, MapPinIcon } from '@/components/icons';
import { Text } from '@/components/ui';
import { colors, spacing } from '@/theme';
import type { Address } from '@/types';

import { LOCATION } from '../constants';

const ICON_BY_LABEL = {
  home: HomeIcon,
  work: MapPinIcon,
  other: MapPinIcon,
} as const;

export interface AddressCardProps {
  address: Address;
  selected?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
}

/** One saved address with a selection radio and an edit affordance. */
export function AddressCard({
  address,
  selected = false,
  onSelect,
  onEdit,
}: AddressCardProps) {
  const Icon = ICON_BY_LABEL[address.label] ?? MapPinIcon;

  return (
    <Pressable
      style={[styles.card, selected && styles.cardSelected]}
      onPress={onSelect}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={address.title}
    >
      <View style={styles.icon}>
        <Icon size={20} color={colors.green700} />
      </View>

      <View style={styles.body}>
        <Text variant="title" tone="primary">
          {address.title}
        </Text>
        <Text variant="caption" tone="muted" style={styles.text}>
          {address.line1}, {address.city} {address.pincode}
        </Text>
      </View>

      <View style={styles.radioOuter}>
        {selected ? <View style={styles.radioInner} /> : null}
      </View>

      <Pressable
        onPress={onEdit}
        accessibilityRole="button"
        accessibilityLabel={`Edit ${address.title} address`}
        hitSlop={8}
      >
        <EditIcon size={18} color={colors.muted} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    height: LOCATION.addressCard.height,
    borderRadius: LOCATION.addressCard.radius,
    borderWidth: 1,
    borderColor: colors.mint200,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: LOCATION.addressCard.paddingHorizontal,
    gap: spacing.sm,
  },
  cardSelected: { borderColor: colors.green },
  icon: {
    width: LOCATION.addressIcon.size,
    height: LOCATION.addressIcon.size,
    borderRadius: LOCATION.addressIcon.radius,
    backgroundColor: colors.mint50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  text: { marginTop: 1 },
  radioOuter: {
    width: LOCATION.radioOuter.size,
    height: LOCATION.radioOuter.size,
    borderRadius: 999,
    borderWidth: LOCATION.radioOuter.borderWidth,
    borderColor: colors.line2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: LOCATION.radioInner.size,
    height: LOCATION.radioInner.size,
    borderRadius: 999,
    backgroundColor: colors.green,
  },
});
