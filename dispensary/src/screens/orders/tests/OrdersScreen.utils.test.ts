import { describe, expect, it } from 'vitest';
import { NAV_SECTIONS } from '@/libs/constants/routes.const';
import { ORDER_FILTER_TABS } from '../OrdersScreen.utils';

describe('orders vs D-008', () => {
  it('hides the Online filter', () => {
    expect(ORDER_FILTER_TABS).not.toContain('online');
    expect(ORDER_FILTER_TABS).toEqual(['all', 'counter', 'needsAction', 'unpaid']);
  });

  it('titles Orders as counter and kiosk history', () => {
    const orders = NAV_SECTIONS.flatMap((section) => section.items).find(
      (item) => item.label === 'Orders',
    );
    expect(orders?.hint).toBe('Counter & kiosk history');
  });
});
