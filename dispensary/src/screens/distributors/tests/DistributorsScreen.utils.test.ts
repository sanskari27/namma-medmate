import { describe, expect, it } from 'vitest';
import {
  hasSupplierAccess,
  licenseStatusCopy,
  toInput,
  validateForm,
  emptyForm,
} from '../DistributorsScreen.utils';

describe('distributors helpers', () => {
  it('grants purchases or accounts', () => {
    expect(hasSupplierAccess(['PROCUREMENT'])).toBe(true);
    expect(hasSupplierAccess(['FINANCE'])).toBe(true);
    expect(hasSupplierAccess(['SALES'])).toBe(false);
  });

  it('explains license status in counter copy', () => {
    expect(licenseStatusCopy('EXPIRED')).toContain('lapsed');
  });

  it('converts rupees to paise on save', () => {
    expect(validateForm(emptyForm)).toBe(false);
    const input = toInput({
      ...emptyForm,
      supplierCode: 'SUP-1',
      legalName: 'Acme',
      contactPersonName: 'Ramesh',
      phone: '9876500001',
      addressLine1: '12 MG Road',
      city: 'Bengaluru',
      state: 'KA',
      pincode: '560001',
      creditLimitRupees: '250000',
    });
    expect(input.creditLimitPaise).toBe(25000000);
  });
});
