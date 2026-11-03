import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { colors, spacing } from '@/theme';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message?: string;
}

/**
 * Catches render errors anywhere below it and shows a recoverable screen
 * instead of a white screen or a native crash.
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : undefined,
    };
  }

  override componentDidCatch(error: unknown, info: unknown): void {
    // Swap for the crash reporter once observability is wired up.
    console.error('[MedMate] Unhandled render error:', error, info);
  }

  private readonly reset = (): void => {
    this.setState({ hasError: false, message: undefined });
  };

  override render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={styles.root}>
        <View style={styles.badge}>
          <Text variant="h2" tone="danger">
            !
          </Text>
        </View>

        <Text variant="h2" tone="primary" align="center">
          Something went wrong
        </Text>

        <Text variant="body" tone="muted" align="center" style={styles.message}>
          {this.state.message ?? 'An unexpected error occurred.'}
        </Text>

        <Button label="Try again" onPress={this.reset} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: colors.redBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: { maxWidth: 300 },
});
