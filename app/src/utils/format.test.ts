import { formatCount, formatCurrency, formatDistance, formatEta } from './format';

describe('formatCurrency', () => {
  it('groups thousands without decimals', () => {
    expect(formatCurrency(1250)).toContain('1,250');
  });

  it('keeps a round amount readable', () => {
    expect(formatCurrency(0)).toContain('0');
  });
});

describe('formatDistance', () => {
  it('keeps one decimal place', () => {
    expect(formatDistance(0.8)).toBe('0.8 km');
  });
});

describe('formatEta', () => {
  it('formats minutes below an hour', () => {
    expect(formatEta(12)).toBe('12 min');
  });

  it('formats whole hours', () => {
    expect(formatEta(60)).toBe('1 hr');
  });

  it('formats hours with the remaining minutes', () => {
    expect(formatEta(95)).toBe('1 hr 35 min');
  });
});

describe('formatCount', () => {
  it('uses the singular for one', () => {
    expect(formatCount(1, 'item')).toBe('1 item');
  });

  it('uses the plural otherwise', () => {
    expect(formatCount(3, 'item')).toBe('3 items');
  });

  it('accepts a custom plural', () => {
    expect(formatCount(2, 'pharmacy', 'pharmacies')).toBe('2 pharmacies');
  });
});
