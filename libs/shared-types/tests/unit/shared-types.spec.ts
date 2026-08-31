import { describe, expect, it } from 'vitest';
import { Environment } from '../../src/index.ts';

describe('shared-types', () => {
  it('exposes environment names', () => {
    expect(Environment.Staging).toBe('staging');
    expect(Environment.Prod).toBe('prod');
    expect(Environment.Local).toBe('local');
  });
});
