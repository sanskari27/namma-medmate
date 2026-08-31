import { describe, expect, it } from 'vitest';
import { addSeconds, parseIso, toIso } from '../../src/index.ts';

describe('date-time-utils', () => {
  it('round-trips ISO dates and adds seconds', () => {
    const date = new Date('2026-01-01T00:00:00.000Z');
    expect(toIso(date)).toBe('2026-01-01T00:00:00.000Z');
    expect(parseIso('2026-01-01T00:00:00.000Z').toISOString()).toBe(date.toISOString());
    expect(addSeconds(date, 30).toISOString()).toBe('2026-01-01T00:00:30.000Z');
  });

  it('rejects invalid ISO strings', () => {
    expect(() => parseIso('nope')).toThrow('Invalid ISO date');
  });
});
