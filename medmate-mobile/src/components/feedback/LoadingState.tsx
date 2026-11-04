import {
  ActivityIndicator,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, spacing } from '@/theme';

import { Text } from '../ui';

export interface LoadingStateProps {
  /** Message shown under the spinner. */
  message?: string;
  size?: 'small' | 'large';
  style?: StyleProp<ViewStyle>;
}

/** Inline loading indicator used while a screen's data is in flight. */
export function LoadingState({ message, size = 'large', style }: LoadingStateProps) {
  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size={size} color={colors.green} />
      {message ? (
        <Text variant="caption" tone="muted" style={styles.message}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  message: { textAlign: 'center' },
});
