import { describe, expect, it } from 'vitest';
import { attentionKindIcon, paymentModeIcon } from '../DashboardScreen.icons';

describe('DashboardScreen.icons', () => {
  it('maps payment modes to lucide icons with a wallet fallback', () => {
    expect(paymentModeIcon('CASH')).toBeTruthy();
    expect(paymentModeIcon('CARD')).toBeTruthy();
    expect(paymentModeIcon('UPI')).toBeTruthy();
    expect(paymentModeIcon('CREDIT')).toBeTruthy();
    expect(paymentModeIcon('BANK_TRANSFER')).toBeTruthy();
    expect(paymentModeIcon('OTHER')).toBeTruthy();
  });

  it('maps attention kinds with a clipboard fallback', () => {
    expect(attentionKindIcon('PRESCRIPTION')).toBeTruthy();
    expect(attentionKindIcon('LOW_STOCK')).toBeTruthy();
    expect(attentionKindIcon('APPROVAL')).toBeTruthy();
    expect(attentionKindIcon('OTHER')).toBeTruthy();
  });
});
