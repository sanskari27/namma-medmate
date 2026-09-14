import { describe, expect, it } from 'vitest';
import {
  emptyDialogForm,
  generateSupplierCode,
  hasSupplierAccess,
  termsLabel,
  toSupplierInput,
  validateDialogForm,
} from '../DistributorsScreen.utils';
import type { Supplier } from '@/services/suppliers';

describe('distributors helpers', () => {
  it('grants purchases or accounts', () => {
    expect(hasSupplierAccess(['PROCUREMENT'])).toBe(true);
    expect(hasSupplierAccess(['FINANCE'])).toBe(true);
    expect(hasSupplierAccess(['SALES'])).toBe(false);
  });

  it('requires core dialog fields', () => {
    expect(validateDialogForm(emptyDialogForm())).toBe(false);
    expect(
      validateDialogForm({
        ...emptyDialogForm(),
        legalName: 'Acme',
        phone: '9876500001',
        addressLine1: '12 MG Road',
        city: 'Bengaluru',
        state: 'KA',
        pincode: '560001',
      }),
    ).toBe(true);
  });

  it('maps credit terms into supplier input', () => {
    const input = toSupplierInput(
      {
        ...emptyDialogForm(),
        legalName: 'Acme Distributors',
        phone: '9876500001',
        addressLine1: '12 MG Road',
        city: 'Bengaluru',
        state: 'KA',
        pincode: '560001',
        paymentTermsChoice: 'CREDIT:30',
      },
      true,
    );
    expect(input.paymentTerms).toBe('CREDIT');
    expect(input.creditPeriodDays).toBe(30);
    expect(input.supplierCode.startsWith('SUP-')).toBe(true);
  });

  it('labels payment terms like the directory', () => {
    const supplier = {
      paymentTerms: 'CREDIT',
      creditPeriodDays: 30,
    } as Supplier;
    expect(termsLabel(supplier)).toBe('30 days credit');
    expect(generateSupplierCode('Bengaluru Pharma').startsWith('SUP-')).toBe(true);
  });
});
