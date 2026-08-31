import { describe, expect, it } from 'vitest';
import {
  getRequestContext,
  requireRequestContext,
  runWithRequestContext,
} from '../../src/index.ts';

describe('request context', () => {
  it('returns undefined outside a store', () => {
    expect(getRequestContext()).toBeUndefined();
  });

  it('runs a callback with context', () => {
    const context = { requestId: 'r', correlationId: 'c', serviceName: 'api' };
    const result = runWithRequestContext(context, () => requireRequestContext());
    expect(result).toEqual(context);
  });

  it('throws when required context is missing', () => {
    expect(() => requireRequestContext()).toThrow('Request context is not available');
  });
});
