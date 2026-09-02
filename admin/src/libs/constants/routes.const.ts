export const ROUTES = {
  LOGIN: '/login',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  DASHBOARD: '/',
  PHARMACIES: '/pharmacies',
  KYC: '/kyc',
  SUBSCRIPTIONS: '/subscriptions',
  LEADS: '/leads',
  SUPPORT: '/support',
  SETTINGS: '/settings',
  OPERATOR_PASSWORD: '/operators/reset-password',
  OPERATORS: '/operators',
  STAFF_VERIFICATIONS: '/staff-verifications',
} as const;

export const NAV_ITEMS = [
  { label: 'Dashboard', path: ROUTES.DASHBOARD },
  { label: 'Pharmacies', path: ROUTES.PHARMACIES },
  { label: 'KYC', path: ROUTES.KYC },
  { label: 'Subscriptions', path: ROUTES.SUBSCRIPTIONS },
  { label: 'Leads', path: ROUTES.LEADS },
  { label: 'Support', path: ROUTES.SUPPORT },
  { label: 'Operators', path: ROUTES.OPERATORS },
  { label: 'Staff approvals', path: ROUTES.STAFF_VERIFICATIONS },
  { label: 'Settings', path: ROUTES.SETTINGS },
  { label: 'Operator password', path: ROUTES.OPERATOR_PASSWORD },
] as const;
