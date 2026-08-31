import type { Logger } from '@namma-medmate/logger';

export function createSilentLogger(): Logger {
  const noop = (): void => undefined;
  return { debug: noop, info: noop, warn: noop, error: noop, child: () => createSilentLogger() };
}
