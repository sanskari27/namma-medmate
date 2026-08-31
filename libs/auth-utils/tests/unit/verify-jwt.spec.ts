// @vitest-environment node
import { createServer } from 'node:http';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { UnauthorizedError } from '@namma-medmate/error-handling';
import { resetJwksCache, verifyAccessToken } from '../../src/index.ts';

describe('verifyAccessToken', () => {
  const keys = { current: undefined as unknown as Awaited<ReturnType<typeof generateKeyPair>> };
  let jwksUri = '';
  let issuer = '';
  let close = (): Promise<void> => Promise.resolve();

  beforeAll(async () => {
    keys.current = await generateKeyPair('RS256');
    const jwk = await exportJWK(keys.current.publicKey);
    jwk.kid = 'test-key';
    jwk.use = 'sig';
    jwk.alg = 'RS256';
    const server = createServer((req, res) => {
      if (req.url === '/jwks.json') {
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ keys: [jwk] }));
        return;
      }
      res.statusCode = 404;
      res.end();
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('failed to bind jwks server');
    }
    issuer = `http://127.0.0.1:${address.port}`;
    jwksUri = `${issuer}/jwks.json`;
    close = () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
  });

  afterAll(async () => {
    resetJwksCache();
    await close();
  });

  async function sign(claims: { sub?: string; iss: string; aud: string }) {
    const jwt = new SignJWT({})
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setIssuedAt()
      .setIssuer(claims.iss)
      .setAudience(claims.aud)
      .setExpirationTime('5m');
    if (claims.sub) {
      jwt.setSubject(claims.sub);
    }
    return jwt.sign(keys.current.privateKey);
  }

  it('verifies a valid RS256 token and caches JWKS', async () => {
    const token = await sign({ sub: 'user-1', iss: issuer, aud: 'namma-medmate-dispensary' });
    const first = await verifyAccessToken(token, {
      issuer,
      audience: 'namma-medmate-dispensary',
      jwksUri,
    });
    const second = await verifyAccessToken(token, {
      issuer,
      audience: 'namma-medmate-dispensary',
      jwksUri,
    });
    expect(first.sub).toBe('user-1');
    expect(second.sub).toBe('user-1');
  });

  it('rejects tokens with the wrong audience or missing sub', async () => {
    const wrongAud = await sign({ sub: 'user-1', iss: issuer, aud: 'other' });
    await expect(
      verifyAccessToken(wrongAud, { issuer, audience: 'namma-medmate-dispensary', jwksUri }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
    const missingSub = await sign({ iss: issuer, aud: 'namma-medmate-dispensary' });
    await expect(
      verifyAccessToken(missingSub, { issuer, audience: 'namma-medmate-dispensary', jwksUri }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
