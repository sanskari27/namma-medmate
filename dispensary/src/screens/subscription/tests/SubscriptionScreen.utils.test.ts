import { describe, expect, it } from 'vitest';
import { planFeatures, planTagline } from '../SubscriptionScreen.utils';

describe('plan rate card copy', () => {
  it('drops hospital from Pro and does not sell CRM on Free', () => {
    expect(planTagline('PRO')).toBe('Kiosk & more');
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
        entitledModules: ['KIOSK', 'LOYALTY'],
      }),
    ).toEqual(['Up to 5 users', 'Up to 5 outlets', 'Loyalty points', 'Self-order kiosk']);
  });
});
