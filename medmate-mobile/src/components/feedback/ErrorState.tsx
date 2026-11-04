import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from '@/theme';

import { Button, Text } from '../ui';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  /** Label for the retry action. Omit to hide the button. */
  retryLabel?: string;
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Shown when a request failed and the screen has nothing else to show. */
export function ErrorState({
  title = 'Something went wrong',
  message = 'We could not load this right now. Please try again.',
  retryLabel = 'Try again',
  onRetry,
  style,
}: ErrorStateProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.badge}>
        <Text variant="h3" tone="danger">
          !
        </Text>
      </View>

      <Text variant="h3" tone="primary" align="center">
        {title}
      </Text>

      {message ? (
        <Text variant="body" tone="muted" align="center" style={styles.message}>
          {message}
        </Text>
      ) : null}

      {onRetry ? (
        <Button label={retryLabel} onPress={onRetry} variant="secondary" size="sm" />
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
  badge: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.redBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  message: { maxWidth: 280 },
});
