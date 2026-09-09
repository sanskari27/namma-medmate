import { describe, expect, it } from 'vitest';
import {
  actualPeriodCaption,
  lowCountLabel,
  pendingCountLabel,
  topSellersHeading,
} from '../DashboardScreen.content';

describe('DashboardScreen.content', () => {
  it('builds count and caption helpers', () => {
    expect(pendingCountLabel(3)).toBe('3 pending');
    expect(lowCountLabel(2)).toBe('2 low');
    expect(topSellersHeading('last 7 days')).toBe('Top sellers · last 7 days');
    expect(actualPeriodCaption('last 30 days')).toBe('actual · last 30 days');
  });
});
