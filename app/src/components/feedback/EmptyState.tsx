import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, spacing } from '@/theme';

import { Button, Text } from '../ui';

export interface EmptyStateProps {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Shown when a list has no items to display. */
export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, style]}>
      <Text variant="h3" tone="primary" align="center">
        {title}
      </Text>

      {message ? (
        <Text variant="body" tone="muted" align="center" style={styles.message}>
          {message}
        </Text>
      ) : null}

      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="secondary" size="sm" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  message: {
    maxWidth: 280,
    color: colors.muted,
  },
});
