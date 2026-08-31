/** @param {string} root */
export function createWebVitestConfig(root) {
  return {
    root,
    test: {
      name: 'unit',
      environment: 'jsdom',
      include: ['tests/unit/**/*.{spec,test}.{ts,tsx}', 'src/**/*.{spec,test}.{ts,tsx}'],
      globals: false,
      setupFiles: ['tests/setup.ts'],
      passWithNoTests: false,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html', 'lcov'],
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          'src/index.ts',
          'src/**/*.d.ts',
          'src/generated/**',
          'src/**/generated/**',
          'src/scenarios/**',
          'src/types/**',
          '**/*.config.*',
        ],
        thresholds: {
          lines: 100,
          branches: 100,
          functions: 100,
          statements: 100,
        },
      },
    },
  };
}
