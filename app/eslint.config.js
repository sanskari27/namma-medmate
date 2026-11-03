// ESLint flat config.
//
// Two jobs:
//   1. Base rules from eslint-config-expo, with Prettier last so formatting
//      never fights the linter.
//   2. Architectural boundaries — the dependency direction between layers is
//      enforced here, not in a review checklist.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

/**
 * Layer rules.
 *
 * The dependency graph is one-directional:
 *
 *   app/  →  features/  →  components/  →  theme/
 *                    ↘        ↓            ↑
 *                   store/  services/  types/  utils/
 *
 * Nothing may point back up. A feature may use anything below it; a
 * primitive may not know that a feature exists.
 */
const LAYERS = {
  features: [
    '@/components',
    '@/theme',
    '@/store',
    '@/services',
    '@/utils',
    '@/types',
    '@/config',
    '@/preferences',
    '@/navigation',
  ],
  components: ['@/theme', '@/types', '@/utils', '@/config'],
  store: ['@/services', '@/types', '@/utils', '@/config', '@/theme'],
  services: ['@/types', '@/utils', '@/config'],
  preferences: ['@/theme', '@/utils', '@/types', '@/config'],
  theme: ['@/types'],
  utils: ['@/types'],
  navigation: ['@/types'],
  shell: [
    '@/components',
    '@/theme',
    '@/preferences',
    '@/navigation',
    '@/types',
    '@/utils',
  ],
  hooks: ['@/theme', '@/types', '@/utils'],
};

const DEEP_RELATIVE = {
  group: ['../../*'],
  message:
    'Use the "@/" alias instead of deep relative paths (e.g. "@/theme/typography").',
};

/** Everything a layer is not allowed to import. */
function forbiddenFor(layer) {
  const allowed = LAYERS[layer] ?? [];

  const candidates = Object.entries(LAYERS)
    .filter(([name]) => name !== layer)
    .flatMap(([, prefixes]) => prefixes);

  return [...new Set(candidates)]
    .filter((prefix) => !allowed.includes(prefix))
    .map((prefix) => ({
      group: [prefix],
      message: `src/${layer} must not import from ${prefix} — that belongs to a higher layer.`,
    }));
}

const boundaryBlocks = Object.keys(LAYERS).map((layer) => ({
  files: [`src/${layer}/**/*.{ts,tsx}`],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [...forbiddenFor(layer), DEEP_RELATIVE],
      },
    ],
  },
}));

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'dist/**',
      'coverage/**',
      'android/**',
      'ios/**',
      'scripts/**',
      'assets/**',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // require explicit return types on exported functions
      '@typescript-eslint/explicit-module-boundary-types': 'warn',
      // catch accidental any
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // hooks rules
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      // Static assets are resolved by Metro, not by Node.
      'import/no-unresolved': [
        'error',
        { ignore: ['\\.png$', '\\.jpe?g$', '\\.webp$', '\\.gif$', '\\.ttf$'] },
      ],
    },
  },
  {
    // Explicit return types matter for the service layer (it is an API
    // surface); on React components they only add noise.
    files: ['**/*.tsx'],
    rules: {
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },
  ...boundaryBlocks,
  {
    // Features may only reach into the navigation contract for route paths.
    files: ['src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/shell'],
              message:
                'A feature may only reach into "@/navigation" for route paths — not into the app shell.',
            },
            {
              group: ['@/app'],
              message:
                '"src/app" is reserved for Expo Router (the route root). Use "@/shell" for app-level providers.',
            },
            DEEP_RELATIVE,
          ],
        },
      ],
    },
  },
  {
    // The font-scale guardrail.
    //
    // React Native applies the OS font-size setting natively to every
    // <Text> unless `allowFontScaling={false}` is set. Our <Text> primitive
    // owns that decision, so screens must not reach for the raw component.
    files: ['src/features/**/*.{ts,tsx}', 'src/components/feedback/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react-native',
              importNames: ['Text'],
              message:
                'Use the <Text> primitive from "@/components/ui" — it owns the font scale. Importing Text from react-native re-introduces the OS font-size bug.',
            },
          ],
          patterns: [DEEP_RELATIVE],
        },
      ],
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
]);
