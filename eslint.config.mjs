import nxPlugin from '@nx/eslint-plugin';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/.nx/**',
      '**/stories/.generated/**',
      '**/playwright-report/**',
      '**/test-results/**',
      '**/.terraform/**',
      'libs/shared-types/src/generated/**',
      'libs/api-client/src/generated/**',
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
    plugins: {
      '@nx': nxPlugin,
    },
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2023,
        sourceType: 'module',
      },
      globals: {
        ...globals.es2023,
      },
    },
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: false,
          allowCircularSelfDependency: false,
          depConstraints: [
            {
              sourceTag: 'type:app',
              onlyDependOnLibsWithTags: ['type:module-ui', 'type:lib'],
            },
            {
              sourceTag: 'type:module-ui',
              onlyDependOnLibsWithTags: ['type:lib'],
            },
            {
              sourceTag: 'type:module-api',
              onlyDependOnLibsWithTags: ['type:lib'],
            },
            {
              sourceTag: 'type:lib',
              onlyDependOnLibsWithTags: ['type:lib'],
            },
            {
              sourceTag: 'type:tool',
              onlyDependOnLibsWithTags: ['type:lib', 'type:tool'],
            },
          ],
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['**/*.{spec,test}.ts', '**/*.{spec,test}.tsx', '**/tests/**/*.{ts,tsx}'],
    rules: {
      'no-console': 'off',
    },
  },
  eslintConfigPrettier,
  {
    files: [
      '**/*.config.ts',
      '**/*.config.mts',
      '**/playwright*.ts',
      '**/.storybook/**/*.{ts,tsx}',
      '**/src/scenarios/**/*.{ts,tsx}',
      '**/tests/visual/**/*.{ts,tsx}',
      '**/tests/e2e/**/*.{ts,tsx}',
    ],
    rules: {
      '@nx/enforce-module-boundaries': 'off',
    },
  },
);
