import { describe, expect, it } from 'vitest';
import { toAuthUser } from '@/services/auth';

describe('HQ chrome identity during support', () => {
  it('keeps MASTER role for HQ chrome and stores acting identity on impersonation', () => {
    const user = toAuthUser({
      userId: 'o1',
      displayName: 'Varshmaan',
      role: 'pharmacy_owner',
      tenantId: 't1',
      pinSet: true,
      impersonation: {
        originalUserId: 'm1',
        originalDisplayName: 'Sanskar',
        effectiveUserId: 'o1',
        effectiveDisplayName: 'Varshmaan',
        effectiveRole: 'pharmacy_owner',
        tenantId: 't1',
        tenantName: 'varshmaan',
      },
    });

    expect(user.role).toBe('admin_super');
    expect(user.userId).toBe('m1');
    expect(user.displayName).toBe('Sanskar');
    expect(user.tenantId).toBeNull();
    expect(user.impersonation?.effectiveUserId).toBe('o1');
    expect(user.impersonation?.effectiveRole).toBe('pharmacy_owner');
  });

  it('leaves a normal HQ login unchanged', () => {
    const user = toAuthUser({
      userId: 'm1',
      displayName: 'Sanskar',
      role: 'admin_super',
      tenantId: null,
      pinSet: true,
    });
    expect(user.role).toBe('admin_super');
    expect(user.userId).toBe('m1');
    expect(user.impersonation).toBeNull();
  });
});
