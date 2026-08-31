import { createServer } from 'node:http';
import { writeFileSync } from 'node:fs';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { listenLocal } from '@namma-medmate/lambda-bootstrap';
import {
  createMemoryAuditRepository,
  createMemoryTenancyRepository,
} from '@namma-medmate/db-services';
import { createApp } from '../../src/app.ts';
import { loadAuditEnv } from '../../src/config/env.ts';
import {
  localSeedPharmacy,
  LOCAL_SEED_LOCATION_ID,
  LOCAL_SEED_TENANT_ID,
} from '../../src/local-seed.ts';

const port = process.env.AUDIT_API_PORT ?? '3004';
const tokensPath = process.env.AUDIT_E2E_TOKENS_PATH ?? '/tmp/audit-e2e-tokens.json';
const keys = await generateKeyPair('RS256');
const jwk = await exportJWK(keys.publicKey);
jwk.kid = 'audit-e2e';
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
    .setProtectedHeader({ alg: 'RS256', kid: 'audit-e2e' })
    .setIssuedAt()
    .setIssuer(issuer)
    .setAudience('namma-medmate-dispensary')
    .setExpirationTime('30m')
    .sign(keys.privateKey);
}

const pharmacy = await token({
  sub: 'chemist-1',
  principal_type: 'pharmacy',
  tenant_id: LOCAL_SEED_TENANT_ID,
  location_id: LOCAL_SEED_LOCATION_ID,
  role: 'pharmacist',
});
const otherPharmacy = await token({
  sub: 'chemist-other',
  principal_type: 'pharmacy',
  tenant_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  location_id: LOCAL_SEED_LOCATION_ID,
  role: 'pharmacist',
});
const hq = await token({ sub: 'ops-1', principal_type: 'hq' });
writeFileSync(tokensPath, JSON.stringify({ pharmacy, otherPharmacy, hq }), 'utf8');

const env = loadAuditEnv({
  ...process.env,
  AUDIT_API_PORT: port,
  AUDIT_PERSISTENCE: 'memory',
  AUDIT_SERVICE_TOKEN: process.env.AUDIT_SERVICE_TOKEN ?? 'e2e-audit-service',
  OIDC_ISSUER: issuer,
  OIDC_AUDIENCE: 'namma-medmate-dispensary',
  OIDC_JWKS_URI: `${issuer}/jwks.json`,
  LOG_LEVEL: 'error',
});

listenLocal(
  createApp(env, {
    tenancy: createMemoryTenancyRepository(localSeedPharmacy()),
    events: createMemoryAuditRepository(),
  }),
  Number(port),
  'audit-api',
);
