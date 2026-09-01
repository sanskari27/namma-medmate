export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/',
  POS: '/pos',
  INVENTORY: '/inventory',
  PROCUREMENT: '/procurement',
  INVOICES: '/invoices',
  CUSTOMERS: '/customers',
  PRESCRIPTIONS: '/prescriptions',
  SETTINGS: '/settings',
} as const;

export const NAV_ITEMS = [
  { label: 'Dashboard', path: ROUTES.DASHBOARD },
  { label: 'POS', path: ROUTES.POS },
  { label: 'Inventory', path: ROUTES.INVENTORY },
  { label: 'Procurement', path: ROUTES.PROCUREMENT },
  { label: 'Invoices', path: ROUTES.INVOICES },
  { label: 'Customers', path: ROUTES.CUSTOMERS },
  { label: 'Prescriptions', path: ROUTES.PRESCRIPTIONS },
  { label: 'Settings', path: ROUTES.SETTINGS },
] as const;
