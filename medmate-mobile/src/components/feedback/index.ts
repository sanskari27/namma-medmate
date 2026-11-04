/**
 * Shared feedback states.
 *
 * Every screen that loads data renders exactly one of these instead of
 * inventing its own spinner or empty copy.
 */

export { LoadingState } from './LoadingState';
export type { LoadingStateProps } from './LoadingState';

export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';

export { ErrorState } from './ErrorState';
export type { ErrorStateProps } from './ErrorState';
