import type { Messages } from '@namma-medmate/i18n';

export const tenancyMessages = {
  'tenancy.badge.shopName': 'Shop',
  'tenancy.shell.product': 'Namma MedMate',
  'tenancy.shell.channel': 'Dispensary',
  'tenancy.errors.locationIdRequired': 'location_id is required',
  'tenancy.errors.locationTenantMismatch': 'Location does not belong to this pharmacy',
  'tenancy.errors.pharmacyNotFound': 'Pharmacy not found',
  'tenancy.errors.locationLimitV1':
    'This pharmacy already has its location. Extra branches are not available.',
  'tenancy.errors.forbiddenRole': 'Only the Owner can update shop identity',
  'tenancy.form.displayName': 'Shop name',
  'tenancy.form.save': 'Save',
  'tenancy.form.gstRegular': 'Regular GST dealer',
  'tenancy.form.retail': 'Retail chemist',
  'tenancy.create.title': 'Create pharmacy',
  'tenancy.create.subtitle': 'Set up a new retail endpoint on the network.',
  'tenancy.rename.title': 'Rename shop',
  'tenancy.rename.subtitle':
    "Update your pharmacy's display name as it appears to customers in the neighborhood.",
  'tenancy.identity.title': 'Pharmacy',
} as const satisfies Messages;

export type TenancyMessageKey = keyof typeof tenancyMessages;
