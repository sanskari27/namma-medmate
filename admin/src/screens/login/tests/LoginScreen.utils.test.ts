import { describe, expect, it } from 'vitest';
import { isHqOperator, statusCopy } from '../LoginScreen.utils';

describe('LoginScreen.utils', () => {
  it('maps HQ login statuses to operator-facing copy', () => {
    expect(statusCopy('validation')?.text).toBe('Enter HQ email and password.');
    expect(statusCopy('denied')?.text).toMatch(/not recognised/);
    expect(statusCopy('empty')).toBeNull();
  });

  it('allows only MASTER operators into HQ', () => {
    expect(isHqOperator('admin_super')).toBe(true);
    expect(isHqOperator('pharmacy_owner')).toBe(false);
  });
});
