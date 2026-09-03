import { describe, expect, it } from 'vitest';
import { PHARMACY_ROLES, statusCopy, tillRole } from '../LoginScreen.utils';

describe('LoginScreen.utils', () => {
  it('maps counter login statuses to chemist-facing copy', () => {
    expect(statusCopy('validation')?.text).toMatch(/email and password/);
    expect(statusCopy('denied')?.text).toMatch(/does not match this counter/);
    expect(statusCopy('locked')?.text).toMatch(/Ask the owner/);
    expect(statusCopy('unverified')?.text).toMatch(/Verify the pharmacy email/);
    expect(statusCopy('empty')).toBeNull();
  });

  it('labels till roles for the saved-login picker', () => {
    expect(tillRole('pharmacy_owner')).toBe('Owner');
    expect(tillRole('pharmacy_staff')).toBe('Counter staff');
  });

  it('accepts only pharmacy roles at this counter', () => {
    expect(PHARMACY_ROLES.has('pharmacy_owner')).toBe(true);
    expect(PHARMACY_ROLES.has('admin_super')).toBe(false);
  });
});
