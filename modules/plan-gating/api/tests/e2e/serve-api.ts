import { createServer } from 'node:http';
import { writeFileSync } from 'node:fs';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { listenLocal } from '@namma-medmate/lambda-bootstrap';
import { createMemoryTenancyRepository } from '@namma-medmate/db-services';
import { createApp } from '../../src/app.ts';
import { loadPlanGatingEnv } from '../../src/config/env.ts';
import { MemoryOverrideReader } from '../../src/deps/overrides.ts';
import { MemorySeatsReader } from '../../src/deps/seats.ts';
import { MemorySubscriptionReader } from '../../src/deps/subscription.ts';
import { localSeedPharmacy } from '../../src/local-seed.ts';

const port = process.env.PLAN_GATING_API_PORT ?? '3006';
const tokensPath = process.env.PLAN_GATING_E2E_TOKENS_PATH ?? '/tmp/plan-gating-e2e-tokens.json';
const keys = await generateKeyPair('RS256');
const jwk = await exportJWK(keys.publicKey);
jwk.kid = 'pg-e2e';
jwk.alg = 'RS256';
jwk.use = 'sig';

const jwks = createServer((req, res) => {
  if (req.url === '/jwks.json') {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ keys: [jwk] }));
    return;
  }
  res.statusCode = 404;
  res.end();
});

await new Promise<void>((resolve) => jwks.listen(0, '127.0.0.1', resolve));
const address = jwks.address();
if (!address || typeof address === 'string') {
  throw new Error('jwks bind failed');
}
const issuer = `http://127.0.0.1:${address.port}`;

async function token(claims: Record<string, unknown>) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid: 'pg-e2e' })
    .setIssuedAt()
    .setIssuer(issuer)
    .setAudience('namma-medmate-dispensary')
    .setExpirationTime('30m')
    .sign(keys.privateKey);
}

const pharmacy = await token({
  sub: 'chemist-1',
  principal_type: 'pharmacy',
  tenant_id: '8f1c0a7e-2b3d-4e5f-8a90-123456789abc',
  location_id: '1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809',
  role: 'owner',
});
const hq = await token({ sub: 'ops-1', principal_type: 'hq' });
writeFileSync(tokensPath, JSON.stringify({ pharmacy, hq }), 'utf8');

const env = loadPlanGatingEnv({
  ...process.env,
  PLAN_GATING_API_PORT: port,
  OIDC_ISSUER: issuer,
  OIDC_AUDIENCE: 'namma-medmate-dispensary',
  OIDC_JWKS_URI: `${issuer}/jwks.json`,
  LOG_LEVEL: 'error',
});

listenLocal(
  createApp(env, {
    tenancy: createMemoryTenancyRepository(localSeedPharmacy()),
    subscriptions: new MemorySubscriptionReader(),
    overrides: new MemoryOverrideReader(),
    seats: new MemorySeatsReader(),
  }),
  Number(port),
  'plan-gating-api',
);
