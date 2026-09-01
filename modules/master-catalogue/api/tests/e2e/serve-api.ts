import { createServer } from 'node:http';
import { writeFileSync } from 'node:fs';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { listenLocal } from '@namma-medmate/lambda-bootstrap';
import {
  createMemoryMasterCatalogueRepository,
  createMemoryTenancyRepository,
} from '@namma-medmate/db-services';
import { createApp } from '../../src/app.ts';
import { MemoryAuditClient } from '../../src/audit/client.ts';
import { loadMasterCatalogueEnv } from '../../src/config/env.ts';
import { MemoryInventoryClient } from '../../src/inventory/client.ts';
import { localSeedPharmacy } from '../../src/local-seed.ts';

const port = process.env.MASTER_CATALOGUE_API_PORT ?? '3005';
const tokensPath =
  process.env.MASTER_CATALOGUE_E2E_TOKENS_PATH ?? '/tmp/master-catalogue-e2e-tokens.json';
const keys = await generateKeyPair('RS256');
const jwk = await exportJWK(keys.publicKey);
jwk.kid = 'mc-e2e';
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
    .setProtectedHeader({ alg: 'RS256', kid: 'mc-e2e' })
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
  role: 'cashier',
});
const hq = await token({ sub: 'ops-1', principal_type: 'hq' });
writeFileSync(tokensPath, JSON.stringify({ pharmacy, hq }), 'utf8');

const env = loadMasterCatalogueEnv({
  ...process.env,
  MASTER_CATALOGUE_API_PORT: port,
  MASTER_CATALOGUE_PERSISTENCE: 'memory',
  MASTER_CATALOGUE_SERVICE_TOKEN: process.env.MASTER_CATALOGUE_SERVICE_TOKEN ?? 'e2e-mc-service',
  OIDC_ISSUER: issuer,
  OIDC_AUDIENCE: 'namma-medmate-dispensary',
  OIDC_JWKS_URI: `${issuer}/jwks.json`,
  LOG_LEVEL: 'error',
});

listenLocal(
  createApp(env, {
    tenancy: createMemoryTenancyRepository(localSeedPharmacy()),
    catalogue: createMemoryMasterCatalogueRepository(),
    inventory: new MemoryInventoryClient(),
    audit: new MemoryAuditClient(),
  }),
  Number(port),
  'master-catalogue-api',
);
