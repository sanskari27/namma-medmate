/// <reference types="jest" />

/**
 * Global test setup.
 *
 * React Native Testing Library v14 registers its matchers automatically and
 * RN 0.88 has no separate `NativeAnimatedHelper` module any more, so the
 * only thing left to stub is persistent storage — the in-app text-size
 * preference is written there.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- the mock has to be required lazily
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
