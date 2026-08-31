export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'dispensary',
        'auth-ui',
        'auth-api',
        'tenancy-ui',
        'tenancy-api',
        'libs',
        'contracts',
        'infra',
        'ci',
        'docs',
        'deps',
        'repo',
      ],
    ],
  },
};
