import { describe, expect, it } from 'vitest';
import { isHqOperator, statusCopy } from '../LoginScreen.utils';

describe('LoginScreen.utils', () => {
  it('maps HQ login statuses to operator-facing copy', () => {
    expect(statusCopy('validation')?.text).toBe('Enter HQ email and password.');
    expect(statusCopy('denied')?.text).toMatch(/not recognised/);
    expect(statusCopy('empty')).toBeNull();
  });

  it('allows MASTER and verification agents into HQ', () => {
    expect(isHqOperator('admin_super')).toBe(true);
    expect(isHqOperator('admin_verification')).toBe(true);
    expect(isHqOperator('pharmacy_owner')).toBe(false);
  });
});
