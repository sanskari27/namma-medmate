import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { EnvConfigError, loadEnv, parametersToEnv, pickEnv, ssmPath } from '../../src/index.ts';

describe('loadEnv', () => {
  it('parses a valid source', () => {
    const schema = z.object({ PORT: z.coerce.number() });
    expect(loadEnv(schema, { PORT: '3001' })).toEqual({ PORT: 3001 });
  });

  it('throws EnvConfigError on invalid input', () => {
    const schema = z.object({ PORT: z.string().min(1) });
    expect(() => loadEnv(schema, {})).toThrow(EnvConfigError);
  });

  it('defaults to process.env', () => {
    const original = process.env.NAMMA_TEST_KEY;
    process.env.NAMMA_TEST_KEY = 'yes';
    expect(loadEnv(z.object({ NAMMA_TEST_KEY: z.string() })).NAMMA_TEST_KEY).toBe('yes');
    if (original === undefined) {
      delete process.env.NAMMA_TEST_KEY;
    } else {
      process.env.NAMMA_TEST_KEY = original;
    }
  });
});

describe('pickEnv and ssm helpers', () => {
  it('picks named keys', () => {
    expect(pickEnv(['A', 'B'], { A: '1' })).toEqual({ A: '1', B: undefined });
  });

  it('maps ssm parameters to env keys and skips incomplete records', () => {
    expect(
      parametersToEnv([
        { Name: '/namma-medmate/staging/auth-api/oidc-issuer', Value: 'http://iss' },
        { Name: 'incomplete' },
        { Value: 'orphan' },
      ]),
    ).toEqual({ OIDC_ISSUER: 'http://iss' });
    expect(parametersToEnv(undefined)).toEqual({});
  });

  it('builds service-scoped ssm paths', () => {
    expect(ssmPath('staging', 'auth-api', 'oidc-audience')).toBe(
      '/namma-medmate/staging/auth-api/oidc-audience',
    );
  });
});
