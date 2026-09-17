import { describe, expect, it } from 'vitest';
import { formatPaise } from '../InventoryScreen.format';

describe('InventoryScreen.format', () => {
  it('keeps paise as two rupee decimals', () => {
    expect(formatPaise(1250)).toBe('₹12.50');
    expect(formatPaise(15000)).toBe('₹150.00');
  });
});
