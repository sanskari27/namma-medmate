export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/',
  PHARMACIES: '/pharmacies',
  KYC: '/kyc',
  SUBSCRIPTIONS: '/subscriptions',
  LEADS: '/leads',
  SUPPORT: '/support',
  SETTINGS: '/settings',
} as const;

export const NAV_ITEMS = [
  { label: 'Dashboard', path: ROUTES.DASHBOARD },
  { label: 'Pharmacies', path: ROUTES.PHARMACIES },
  { label: 'KYC', path: ROUTES.KYC },
  { label: 'Subscriptions', path: ROUTES.SUBSCRIPTIONS },
  { label: 'Leads', path: ROUTES.LEADS },
  { label: 'Support', path: ROUTES.SUPPORT },
  { label: 'Settings', path: ROUTES.SETTINGS },
] as const;
