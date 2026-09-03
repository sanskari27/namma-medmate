import { describe, expect, it } from 'vitest';
import {
  formatPhone,
  hasCrmAccess,
  hasHealthFlag,
  railClass,
  toInput,
  type FormState,
} from '../CustomersScreen.utils';
import type { Customer } from '@/services/customers';

const base: Customer = {
  id: 'c1',
  tenantId: 't1',
  name: 'Ravi',
  phone: '9876500001',
  email: null,
  dateOfBirth: null,
  gender: null,
  address: null,
  bloodGroup: null,
  allergies: null,
  chronicConditions: null,
  createdAt: '2026-09-04T00:00:00Z',
  updatedAt: '2026-09-04T00:00:00Z',
};

describe('CustomersScreen.utils', () => {
  it('formats ten-digit phones for the floor list', () => {
    expect(formatPhone('9876500001')).toBe('98765 00001');
    expect(formatPhone('+91-98765')).toBe('+91-98765');
  });

  it('gates CRM module access', () => {
    expect(hasCrmAccess(['CRM'])).toBe(true);
    expect(hasCrmAccess(['SALES'])).toBe(false);
  });

  it('marks health rails from allergies or chronic notes', () => {
    expect(hasHealthFlag(base)).toBe(false);
    expect(railClass(base)).toBe('bg-brand');
    expect(hasHealthFlag({ ...base, allergies: 'Penicillin' })).toBe(true);
    expect(railClass({ ...base, chronicConditions: 'Asthma' })).toBe('bg-warn');
  });

  it('trims optional fields out of the save payload', () => {
    const form: FormState = {
      name: '  Ravi  ',
      phone: ' 9876500001 ',
      email: ' ',
      dateOfBirth: '',
      gender: 'MALE',
      address: '',
      bloodGroup: 'B+',
      allergies: '',
      chronicConditions: '',
    };
    expect(toInput(form)).toEqual({
      name: 'Ravi',
      phone: '9876500001',
      gender: 'MALE',
      bloodGroup: 'B+',
    });
  });
});
