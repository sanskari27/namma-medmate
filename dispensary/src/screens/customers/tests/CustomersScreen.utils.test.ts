import { describe, expect, it } from 'vitest';
import { formatPhone, hasCrmAccess, hasLoyaltyAccess } from '../CustomersScreen.utils';

describe('CustomersScreen.utils', () => {
  it('formats ten-digit phones for the floor list', () => {
    expect(formatPhone('9876500001')).toBe('+91 98765 00001');
    expect(formatPhone('+91-98765')).toBe('+91-98765');
  });

  it('gates CRM module access', () => {
    expect(hasCrmAccess(['CRM'])).toBe(true);
    expect(hasCrmAccess(['SALES'])).toBe(false);
  });

  it('gates loyalty adjust on the LOYALTY module', () => {
    expect(hasLoyaltyAccess(['LOYALTY'])).toBe(true);
    expect(hasLoyaltyAccess(['CRM'])).toBe(false);
  });
});
