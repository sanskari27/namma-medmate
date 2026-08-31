/** @param {string} root */
export function createNodeVitestConfig(root) {
  return {
    root,
    test: {
      name: 'unit',
      environment: 'node',
      include: ['tests/unit/**/*.{spec,test}.ts', 'src/**/*.{spec,test}.ts'],
      globals: false,
      passWithNoTests: false,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html', 'lcov'],
        include: ['src/**/*.ts'],
        exclude: [
          'src/index.ts',
          'src/**/*.d.ts',
          'src/generated/**',
          'src/**/generated/**',
          'src/event-map.ts',
          'src/generated/**',
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
