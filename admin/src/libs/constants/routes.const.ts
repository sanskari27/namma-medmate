export const ROUTES = {
  LOGIN: '/login',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  DASHBOARD: '/',
  PHARMACIES: '/pharmacies',
  KYC: '/kyc',
  LICENCE_EXPIRY: '/licence-expiry',
  WHATSAPP_TEMPLATES: '/whatsapp-templates',
  SUBSCRIPTIONS: '/subscriptions',
  SUPPORT: '/support',
  OPERATOR_PASSWORD: '/operators/reset-password',
  OPERATORS: '/operators',
  STAFF_VERIFICATIONS: '/staff-verifications',
  DESKS: '/desks',
  WORKFLOWS: '/workflows',
  SIGN_OFFS: '/sign-offs',
  ACTIVITY: '/activity',
} as const;

export const NAV_ITEMS = [
  { label: 'Dashboard', path: ROUTES.DASHBOARD, masterOnly: false, modules: [] as const },
  { label: 'Pharmacies', path: ROUTES.PHARMACIES, masterOnly: true, modules: [] as const },
  { label: 'KYC', path: ROUTES.KYC, masterOnly: false, modules: ['TENANT_KYC'] as const },
  { label: 'Licence expiry', path: ROUTES.LICENCE_EXPIRY, masterOnly: true, modules: [] as const },
  {
    label: 'WABA templates',
    path: ROUTES.WHATSAPP_TEMPLATES,
    masterOnly: true,
    modules: [] as const,
  },
  { label: 'Subscriptions', path: ROUTES.SUBSCRIPTIONS, masterOnly: true, modules: [] as const },
  { label: 'Support', path: ROUTES.SUPPORT, masterOnly: true, modules: [] as const },
  { label: 'Operators', path: ROUTES.OPERATORS, masterOnly: true, modules: [] as const },
  {
    label: 'Staff approvals',
    path: ROUTES.STAFF_VERIFICATIONS,
    masterOnly: false,
    modules: ['STAFF_VERIFICATION'] as const,
  },
  { label: 'HQ desks', path: ROUTES.DESKS, masterOnly: true, modules: [] as const },
  { label: 'Workflow desks', path: ROUTES.WORKFLOWS, masterOnly: true, modules: [] as const },
  { label: 'HQ sign-offs', path: ROUTES.SIGN_OFFS, masterOnly: true, modules: [] as const },
  { label: 'Platform activity', path: ROUTES.ACTIVITY, masterOnly: true, modules: [] as const },
  { label: 'Operator password', path: ROUTES.OPERATOR_PASSWORD, masterOnly: true, modules: [] as const },
] as const;

export function visibleHqNav(
  role: string | undefined,
  modules: string[] | undefined,
): (typeof NAV_ITEMS)[number][] {
  if (role === 'admin_super') {
    return [...NAV_ITEMS];
  }
  const granted = modules ?? [];
  return NAV_ITEMS.filter((item) => {
    if (item.masterOnly) {
      return false;
    }
    if (item.path === ROUTES.DASHBOARD) {
      return true;
    }
    if (item.path === ROUTES.STAFF_VERIFICATIONS && role === 'admin_verification') {
      return true;
    }
    return item.modules.some((code) => granted.includes(code));
  });
}
