import { describe, expect, it } from 'vitest';
import { planFeatures, planTagline } from '../SubscriptionScreen.utils';

describe('plan rate card copy', () => {
  it('names hospital on Pro and does not sell CRM on Free', () => {
    expect(planTagline('PRO')).toBe('Hospital, kiosk & more');
    expect(
      planFeatures({
        planCode: 'FREE',
        pricePaiseMonthly: 0,
        maxUsers: 3,
        maxBranches: 1,
        entitledModules: ['SALES', 'CRM', 'REPORTING', 'FINANCE'],
      }),
    ).toEqual(['Up to 3 users', 'Up to 1 outlet', 'Billing / POS & GST invoices']);
    expect(
      planFeatures({
        planCode: 'PRO',
        pricePaiseMonthly: 1,
        maxUsers: 5,
        maxBranches: 5,
        entitledModules: ['KIOSK', 'LOYALTY', 'HOSPITAL'],
      }),
    ).toEqual([
      'Up to 5 users',
      'Up to 5 outlets',
      'Loyalty points',
      'Self-order kiosk',
      'Hospital billing & IPD',
    ]);
  });
});
