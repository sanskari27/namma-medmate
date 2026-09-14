import { ROUTES } from '@/libs/constants/routes.const';

export const ACCOUNT_CONTENT = {
  regionLabel: 'Pharmacy account',
  editProfile: 'Edit profile',
  planUsage: 'Plan & usage',
  completeness: 'Profile completeness',
  verification: 'Business verification',
  team: 'Team',
  settings: 'Account settings',
  manage: 'Manage',
  update: 'Update',
  add: 'Add',
  signOut: 'Sign out',
  finishTodos: 'Finish these to keep the floor unlocked and invoices complete:',
  kycTitle: 'KYC pack',
  kycHint: 'Upload licence evidence from this counter so the floor can stay open.',
  submitKyc: 'Submit KYC pack',
  sending: 'Sending pack…',
} as const;

export const ACCOUNT_LINKS = [
  { label: 'Licences', hint: 'Drug, GST, FSSAI and pharmacist papers', path: ROUTES.LICENSES },
  { label: 'Staff accounts', hint: 'Who can sign in at this pharmacy', path: ROUTES.USERS },
  { label: 'Floor roles', hint: 'What each staff login can access', path: ROUTES.ROLES },
  { label: 'Subscription', hint: 'Plan for this pharmacy', path: ROUTES.SUBSCRIPTION },
  { label: 'Outlets', hint: 'Branches at this pharmacy', path: ROUTES.BRANCHES },
  { label: 'CA / Accountant', hint: 'Share reports with your CA', path: ROUTES.ACCOUNTANT },
  { label: 'WhatsApp slots', hint: 'Approved message slots', path: ROUTES.WHATSAPP_TEMPLATES },
  { label: 'Sign-off rules', hint: 'When a till action needs another person', path: ROUTES.APPROVALS },
] as const;
