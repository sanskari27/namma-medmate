export const ROUTES = {
  LOGIN: '/login',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  REGISTER: '/register',
  VERIFY_EMAIL: '/verify-email',
  DASHBOARD: '/',
  ORDERS: '/orders',
  SALES: '/pos',
  RETURNS: '/returns',
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
  BOOKS: '/books',
  REPORTS: '/reports',
  EXPENSES: '/expenses',
  AGING: '/aging',
  ACCOUNTANT: '/accountant',
  ACCOUNT: '/account',
  LICENSES: '/licenses',
  REGISTERS: '/registers',
  CONTROLLED_REGISTER: '/controlled-register',
  EMPLOYEES: '/employees',
  USERS: '/users',
  ROLES: '/roles',
  APPROVALS: '/approvals',
  APPROVALS_PENDING: '/approvals/pending',
  ACTIVITY: '/activity',
  BRANCHES: '/branches',
  INVOICE_SETTINGS: '/invoice-settings',
  SUBSCRIPTION: '/subscription',
  REFER: '/refer',
  SETTINGS: '/settings',
  HELP: '/help',
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
  hint: 'Shop glance for this pharmacy',
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
      { label: 'Returns', path: ROUTES.RETURNS, hint: 'Take a sale back at this counter' },
      { label: 'Prescriptions', path: ROUTES.PRESCRIPTIONS, hint: 'Rx file for this pharmacy' },
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
      { label: 'Purchases', path: ROUTES.PURCHASES, hint: 'Outlet purchase orders' },
      { label: 'Reorder / Distributor', path: ROUTES.REORDER, hint: 'What to indent next' },
      { label: 'Distributors', path: ROUTES.DISTRIBUTORS, hint: 'Supplier book' },
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
      { label: 'Khata dues', path: ROUTES.AGING, hint: 'What the shop is owed and owes' },
      { label: 'Shop books', path: ROUTES.BOOKS, hint: 'Day book, GST and P&L' },
      { label: 'CA / Accountant', path: ROUTES.ACCOUNTANT, hint: 'Books for the CA' },
    ],
  },
  {
    id: 'account',
    label: 'Account',
    items: [
      { label: 'Account', path: ROUTES.ACCOUNT, hint: 'Pharmacy account' },
      { label: 'Licences', path: ROUTES.LICENSES, hint: 'Drug, GST, FSSAI and pharmacist papers' },
      {
        label: 'Register book',
        path: ROUTES.REGISTERS,
        hint: 'H1, stock, licence and purchase books for this outlet',
      },
      {
        label: 'NDPS sale book',
        path: ROUTES.CONTROLLED_REGISTER,
        hint: 'Who this outlet sold Schedule stock to',
      },
      { label: 'Employees', path: ROUTES.EMPLOYEES, hint: 'Staff on this floor' },
      { label: 'Staff accounts', path: ROUTES.USERS, hint: 'Who can sign in at this pharmacy' },
      { label: 'Floor roles', path: ROUTES.ROLES, hint: 'What each staff login can access' },
      {
        label: 'Sign-off rules',
        path: ROUTES.APPROVALS,
        hint: 'When a till action needs another sign-off',
      },
      {
        label: 'Waiting for sign-off',
        path: ROUTES.APPROVALS_PENDING,
        hint: 'Requests waiting on the counter',
      },
      { label: 'Floor activity', path: ROUTES.ACTIVITY, hint: 'Who signed in and what they did' },
      { label: 'Outlets', path: ROUTES.BRANCHES, hint: 'Branches at this pharmacy' },
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
  (item) =>
    item.path !== ROUTES.DASHBOARD &&
    item.path !== ROUTES.USERS &&
    item.path !== ROUTES.ROLES &&
    item.path !== ROUTES.APPROVALS &&
    item.path !== ROUTES.APPROVALS_PENDING &&
    item.path !== ROUTES.ACTIVITY &&
    item.path !== ROUTES.ACCOUNT &&
    item.path !== ROUTES.LICENSES &&
    item.path !== ROUTES.REGISTERS &&
    item.path !== ROUTES.CONTROLLED_REGISTER &&
    item.path !== ROUTES.BRANCHES &&
    item.path !== ROUTES.SUBSCRIPTION &&
    item.path !== ROUTES.KIOSK &&
    item.path !== ROUTES.CUSTOMERS &&
    item.path !== ROUTES.CREDIT &&
    item.path !== ROUTES.INVENTORY &&
    item.path !== ROUTES.SALES &&
    item.path !== ROUTES.RETURNS &&
    item.path !== ROUTES.PRESCRIPTIONS &&
    item.path !== ROUTES.DISTRIBUTORS &&
    item.path !== ROUTES.PURCHASES &&
    item.path !== ROUTES.OFFERS &&
    item.path !== ROUTES.EXPENSES &&
    item.path !== ROUTES.AGING &&
    item.path !== ROUTES.BOOKS &&
    item.path !== ROUTES.ACCOUNTANT,
).map((item) => ({
  path: item.path,
  title: item.label,
}));

export const NAV_ITEMS = MODULE_NAV_ITEMS.map(({ label, path }) => ({ label, path }));
