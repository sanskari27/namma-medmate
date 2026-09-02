export const ROUTES = {
  LOGIN: '/login',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  DASHBOARD: '/',
  ORDERS: '/orders',
  SALES: '/pos',
  PRESCRIPTIONS: '/prescriptions',
  CUSTOMERS: '/customers',
  CREDIT: '/credit',
  CRM: '/crm',
  INVENTORY: '/inventory',
  RACKS: '/racks',
  PURCHASES: '/purchases',
  REORDER: '/reorder',
  DISTRIBUTORS: '/distributors',
  ONLINE_STORE: '/online-store',
  OFFERS: '/offers',
  KIOSK: '/kiosk',
  REPORTS: '/reports',
  EXPENSES: '/expenses',
  ACCOUNTANT: '/accountant',
  ACCOUNT: '/account',
  EMPLOYEES: '/employees',
  USERS: '/users',
  INVOICE_SETTINGS: '/invoice-settings',
  SUBSCRIPTION: '/subscription',
  REFER: '/refer',
  SETTINGS: '/settings',
  HELP: '/help',
  STAFF_PASSWORD: '/staff-password',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];

export type NavItem = {
  label: string;
  path: AppRoute;
  hint: string;
  badge?: { count: number; label: string };
};

export type NavSection = {
  id: string;
  label: string;
  items: readonly NavItem[];
};

export const DASHBOARD_NAV: NavItem = {
  label: 'Dashboard',
  path: ROUTES.DASHBOARD,
  hint: 'Counter overview',
};

export const NAV_SECTIONS = [
  {
    id: 'billing',
    label: 'Billing / POS',
    items: [
      {
        label: 'Orders',
        path: ROUTES.ORDERS,
        hint: 'Held bills at this counter',
        badge: { count: 1, label: '1 held bill' },
      },
      { label: 'Sales', path: ROUTES.SALES, hint: 'Bill at this counter' },
      {
        label: 'Prescriptions',
        path: ROUTES.PRESCRIPTIONS,
        hint: 'Rx waiting at this counter',
        badge: { count: 3, label: '3 prescriptions waiting' },
      },
      { label: 'Customers', path: ROUTES.CUSTOMERS, hint: 'Walk-in and regulars' },
      { label: 'Credit / Khata', path: ROUTES.CREDIT, hint: 'Khata balances' },
      { label: 'CRM / Patients', path: ROUTES.CRM, hint: 'Patient records at this pharmacy' },
    ],
  },
  {
    id: 'catalogue',
    label: 'Catalogue',
    items: [
      { label: 'Inventory', path: ROUTES.INVENTORY, hint: 'Stock on this floor' },
      { label: 'Rack & Locations', path: ROUTES.RACKS, hint: 'Where the pack sits' },
      { label: 'Purchases', path: ROUTES.PURCHASES, hint: 'Incoming stock' },
      { label: 'Reorder / Distributor', path: ROUTES.REORDER, hint: 'What to indent next' },
      { label: 'Distributors', path: ROUTES.DISTRIBUTORS, hint: 'Supplier book' },
      { label: 'Online Store', path: ROUTES.ONLINE_STORE, hint: 'Web catalogue for this pharmacy' },
      { label: 'Offers', path: ROUTES.OFFERS, hint: 'Schemes at this counter' },
      { label: 'Self-Order Kiosk', path: ROUTES.KIOSK, hint: 'Kiosk at this branch' },
    ],
  },
  {
    id: 'business',
    label: 'Business',
    items: [
      { label: 'Reports', path: ROUTES.REPORTS, hint: 'This branch numbers' },
      { label: 'Expenses', path: ROUTES.EXPENSES, hint: 'Shop-floor spend' },
      { label: 'CA / Accountant', path: ROUTES.ACCOUNTANT, hint: 'Books for the CA' },
    ],
  },
  {
    id: 'account',
    label: 'Account',
    items: [
      { label: 'Account', path: ROUTES.ACCOUNT, hint: 'Pharmacy account' },
      { label: 'Employees', path: ROUTES.EMPLOYEES, hint: 'Staff on this floor' },
      {
        label: 'Staff password',
        path: ROUTES.STAFF_PASSWORD,
        hint: 'Set a temporary till password',
      },
      { label: 'Manage Users', path: ROUTES.USERS, hint: 'Who can sign in here' },
      { label: 'Invoice Settings', path: ROUTES.INVOICE_SETTINGS, hint: 'Bill header and GSTIN' },
      { label: 'Subscription', path: ROUTES.SUBSCRIPTION, hint: 'Plan for this pharmacy' },
      { label: 'Refer & Earn', path: ROUTES.REFER, hint: 'Refer another chemist' },
      { label: 'Settings', path: ROUTES.SETTINGS, hint: 'Counter preferences' },
      { label: 'Help & Support', path: ROUTES.HELP, hint: 'Get help at this counter' },
    ],
  },
] as const satisfies readonly NavSection[];

export const MODULE_NAV_ITEMS: readonly NavItem[] = [
  DASHBOARD_NAV,
  ...NAV_SECTIONS.flatMap((section) => [...section.items]),
];

export const STUB_PAGES = MODULE_NAV_ITEMS.filter(
  (item) => item.path !== ROUTES.DASHBOARD && item.path !== ROUTES.STAFF_PASSWORD,
).map((item) => ({
  path: item.path,
  title: item.label,
}));

export const NAV_ITEMS = MODULE_NAV_ITEMS.map(({ label, path }) => ({ label, path }));
