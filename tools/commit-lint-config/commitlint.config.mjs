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
        'plan-gating-ui',
        'plan-gating-api',
        'manage-users-ui',
        'manage-users-api',
        'manage-users',
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
