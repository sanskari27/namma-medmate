import { describe, expect, it } from 'vitest';
import { istLocalToUtcIso, utcIsoToIstLocal } from '../OffersScreen.utils';

describe('scheme window IST round-trip', () => {
  it('shows UTC instants as IST datetime-local and writes IST back as UTC', () => {
    expect(utcIsoToIstLocal('2026-09-05T18:30:00Z')).toBe('2026-09-06T00:00');
    expect(istLocalToUtcIso('2026-09-06T00:00')).toBe('2026-09-05T18:30:00.000Z');
  });
});
