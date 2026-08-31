import { defineConfig } from 'vitest/config';
import { createNodeVitestConfig } from '@namma-medmate/vitest-config/node';

const base = createNodeVitestConfig(import.meta.dirname);

export default defineConfig({
  ...base,
  test: {
    ...base.test,
    coverage: {
      ...base.test.coverage,
      exclude: ['src/**/*.d.ts', '**/*.config.*'],
    },
  },
});
