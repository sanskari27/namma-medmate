import { createServer, type Server } from 'node:http';
import { generateKeyPair, exportJWK, SignJWT, type GenerateKeyPairResult } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp, resolveApiSpecPath } from '../../src/app.ts';
import { loadAuthEnv } from '../../src/config/env.ts';
import { createGetSessionController } from '../../src/controllers/get-session.controller.ts';

describe('auth env', () => {
  it('loads required oidc settings', () => {
    const env = loadAuthEnv({
      OIDC_ISSUER: 'http://localhost:8081',
      OIDC_AUDIENCE: 'namma-medmate-dispensary',
      OIDC_JWKS_URI: 'http://localhost:8081/jwks.json',
    });
    expect(env.AUTH_API_PORT).toBe(3001);
    expect(env.OIDC_AUDIENCE).toBe('namma-medmate-dispensary');
  });
});

describe('resolveApiSpecPath', () => {
  it('prefers the module-relative swagger when it exists', () => {
    expect(
      resolveApiSpecPath(
        (path) => path.endsWith('contract/swagger.yaml'),
        'file:///modules/auth/api/src/app.ts',
        '/tmp',
      ),
    ).toMatch(/contract\/swagger\.yaml$/);
  });

  it('falls back to cwd copies and ignores an invalid module url', () => {
    expect(
      resolveApiSpecPath((path) => path === '/var/task/swagger.yaml', 'not-a-url', '/var/task'),
    ).toBe('/var/task/swagger.yaml');
    expect(resolveApiSpecPath(() => false, undefined, '/tmp')).toBeUndefined();
  });
});

describe('auth-api session', () => {
  let keys: GenerateKeyPairResult;
  let server: Server;
  let issuer = '';
  let jwksUri = '';

  beforeAll(async () => {
    keys = await generateKeyPair('RS256');
    const jwk = await exportJWK(keys.publicKey);
    jwk.kid = 'auth-test';
    jwk.alg = 'RS256';
    jwk.use = 'sig';
    server = createServer((req, res) => {
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
      throw new Error('jwks bind failed');
    }
    issuer = `http://127.0.0.1:${address.port}`;
    jwksUri = `${issuer}/jwks.json`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  async function token(claims: Record<string, unknown>) {
    return new SignJWT(claims)
      .setProtectedHeader({ alg: 'RS256', kid: 'auth-test' })
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(keys.privateKey);
  }

  function env() {
    return loadAuthEnv({
      OIDC_ISSUER: issuer,
      OIDC_AUDIENCE: 'namma-medmate-dispensary',
      OIDC_JWKS_URI: jwksUri,
      LOG_LEVEL: 'error',
    });
  }

  it('returns session identity for a valid token', async () => {
    const app = createApp(env());
    const jwt = await token({ sub: 'user-1', iss: issuer, aud: 'namma-medmate-dispensary' });
    const response = await request(app).get('/auth/session').set('Authorization', `Bearer ${jwt}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: { authenticated: true, sub: 'user-1' },
    });
  });

  it('returns 401 for a malformed authorization header', async () => {
    const response = await request(createApp(env()))
      .get('/auth/session')
      .set('Authorization', 'Token nope');
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('returns 401 for an invalid signature', async () => {
    const other = await generateKeyPair('RS256');
    const jwt = await new SignJWT({
      sub: 'user-1',
      iss: issuer,
      aud: 'namma-medmate-dispensary',
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'auth-test' })
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(other.privateKey);
    const response = await request(createApp(env()))
      .get('/auth/session')
      .set('Authorization', `Bearer ${jwt}`);
    expect(response.status).toBe(401);
  });

  it('auto-mounts /health', async () => {
    const response = await request(createApp(env())).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  it('controller verifies tokens directly', async () => {
    const jwt = await token({ sub: 'user-9', iss: issuer, aud: 'namma-medmate-dispensary' });
    const result = await createGetSessionController(env())({ authorization: `Bearer ${jwt}` });
    expect(result.data.sub).toBe('user-9');
  });
});
