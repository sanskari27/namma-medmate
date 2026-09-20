export const ROUTES = {
  LOGIN: '/login',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  REGISTER: '/register',
  VERIFY_EMAIL: '/verify-email',
  DASHBOARD: '/',
  SALES: '/pos',
  ORDERS: '/orders',
  RETURNS: '/returns',
  PRESCRIPTIONS: '/prescriptions',
  CUSTOMERS: '/customers',
  HOSPITAL_WARDS: '/hospital-wards',
  HOSPITAL_INDENTS: '/hospital-indents',
  HOSPITAL_ISSUES: '/hospital-issues',
  HOSPITAL_BILLING: '/hospital-billing',
  HOSPITAL_DEPARTMENTS: '/hospital-departments',
  HOSPITAL_DOCTORS: '/hospital-doctors',
  CAMPAIGNS: '/campaigns',
  CREDIT: '/credit',
  INVENTORY: '/inventory',
  PURCHASES: '/purchases',
  DISTRIBUTORS: '/distributors',
  OFFERS: '/offers',
  KIOSK: '/kiosk',
  BOOKS: '/books',
  REPORTS: '/reports',
  CUSTOM_REPORTS: '/custom-reports',
  EXPENSES: '/expenses',
  AGING: '/aging',
  ACCOUNTANT: '/accountant',
  ACCOUNT: '/account',
  LICENSES: '/licenses',
  WHATSAPP_TEMPLATES: '/whatsapp-templates',
  WHATSAPP_SENDS: '/whatsapp-sends',
  REGISTERS: '/registers',
  CONTROLLED_REGISTER: '/controlled-register',
  USERS: '/users',
  ROLES: '/roles',
  APPROVALS: '/approvals',
  APPROVALS_PENDING: '/approvals/pending',
  ACTIVITY: '/activity',
  PRIVACY: '/privacy',
  BRANCHES: '/branches',
  SUBSCRIPTION: '/subscription',
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
      { label: 'Sales', path: ROUTES.SALES, hint: 'Bill at this counter' },
      { label: 'Orders', path: ROUTES.ORDERS, hint: 'Counter & kiosk history' },
      { label: 'Sale returns', path: ROUTES.RETURNS, hint: 'Take a sale back' },
      { label: 'Prescriptions', path: ROUTES.PRESCRIPTIONS, hint: 'Rx file for this pharmacy' },
      { label: 'Customers', path: ROUTES.CUSTOMERS, hint: 'Walk-in and regulars' },
      { label: 'Tag broadcasts', path: ROUTES.CAMPAIGNS, hint: 'WhatsApp lists from patient tags' },
    ],
  },
  {
    id: 'hospital',
    label: 'Hospital',
    items: [
      {
        label: 'IPD · Wards',
        path: ROUTES.HOSPITAL_WARDS,
        hint: 'Ward beds and live occupancy',
      },
      {
        label: 'Ward indents',
        path: ROUTES.HOSPITAL_INDENTS,
        hint: 'Floor requisitions awaiting issue',
      },
      {
        label: 'Issue to ward',
        path: ROUTES.HOSPITAL_ISSUES,
        hint: 'Issue stock and bill the hospital',
      },
      {
        label: 'Hospital billing',
        path: ROUTES.HOSPITAL_BILLING,
        hint: 'Bill-to institution and credit prices',
      },
      {
        label: 'Departments',
        path: ROUTES.HOSPITAL_DEPARTMENTS,
        hint: 'OPD, IPD, and diagnostic units',
      },
      {
        label: 'Doctors',
        path: ROUTES.HOSPITAL_DOCTORS,
        hint: 'Hospital doctor directory — no login',
      },
    ],
  },
  {
    id: 'catalogue',
    label: 'Catalogue',
    items: [
      { label: 'Inventory', path: ROUTES.INVENTORY, hint: 'Stock, batches & expiry' },
      { label: 'Purchases', path: ROUTES.PURCHASES, hint: 'Distributor billing → auto-stock' },
      {
        label: 'Distributors',
        path: ROUTES.DISTRIBUTORS,
        hint: 'Your distributor & supplier directory',
      },
      { label: 'Offers', path: ROUTES.OFFERS, hint: 'Discounts & promotions' },
      { label: 'Self-Order Kiosk', path: ROUTES.KIOSK, hint: 'Kiosk at this branch' },
    ],
  },
  {
    id: 'business',
    label: 'Business',
    items: [
      { label: 'Compare weeks', path: ROUTES.REPORTS, hint: 'This week vs last week' },
      {
        label: 'Build a report',
        path: ROUTES.CUSTOM_REPORTS,
        hint: 'Pick columns and download a sheet',
      },
      { label: 'Expenses', path: ROUTES.EXPENSES, hint: 'Track business spend & categories' },
      { label: 'Credit · Khata', path: ROUTES.CREDIT, hint: 'Customer credit, dues & repayments' },
      { label: 'Khata dues', path: ROUTES.AGING, hint: 'Outstanding by age bucket' },
      { label: 'Shop GST books', path: ROUTES.BOOKS, hint: 'Sales & GST summary' },
      { label: 'CA / Accountant', path: ROUTES.ACCOUNTANT, hint: 'Share reports with your CA' },
    ],
  },
  {
    id: 'account',
    label: 'Account',
    items: [
      { label: 'Account', path: ROUTES.ACCOUNT, hint: 'Pharmacy account' },
      { label: 'Licences', path: ROUTES.LICENSES, hint: 'Drug, GST, FSSAI and pharmacist papers' },
      {
        label: 'WhatsApp slots',
        path: ROUTES.WHATSAPP_TEMPLATES,
        hint: 'Approved message slots for this pharmacy',
      },
      {
        label: 'WhatsApp sends',
        path: ROUTES.WHATSAPP_SENDS,
        hint: 'Queued, sent and failed patient messages',
      },
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
      {
        label: 'Privacy desk',
        path: ROUTES.PRIVACY,
        hint: 'Access, correction, export and erasure for this shop',
      },
      { label: 'Outlets', path: ROUTES.BRANCHES, hint: 'Branches at this pharmacy' },
      { label: 'Subscription', path: ROUTES.SUBSCRIPTION, hint: 'Plan for this pharmacy' },
    ],
  },
] as const satisfies readonly NavSection[];

export const MODULE_NAV_ITEMS: readonly NavItem[] = [
  DASHBOARD_NAV,
  ...NAV_SECTIONS.flatMap((section) => [...section.items]),
];

export const NAV_ITEMS = MODULE_NAV_ITEMS.map(({ label, path }) => ({ label, path }));

const LOCKED_ALWAYS = new Set<string>([ROUTES.ACCOUNT]);
const LOCKED_AFTER_KYC = new Set<string>([ROUTES.ACCOUNT, ROUTES.SUBSCRIPTION]);

export function floorNavAllowed(
  tenantStatus: string | null | undefined,
  path: string,
): boolean {
  if (!tenantStatus || tenantStatus === 'ACTIVE') {
    return true;
  }
  if (tenantStatus === 'VERIFICATION_REQUIRED') {
    return LOCKED_ALWAYS.has(path);
  }
  return LOCKED_AFTER_KYC.has(path);
}
