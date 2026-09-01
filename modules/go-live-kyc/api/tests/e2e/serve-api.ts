import { createServer } from 'node:http';
import { writeFileSync } from 'node:fs';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { listenLocal } from '@namma-medmate/lambda-bootstrap';
import {
  createMemoryAuthRepository,
  createMemoryTenancyRepository,
} from '@namma-medmate/db-services';
import { createApp } from '../../src/app.ts';
import { loadGoLiveKycEnv } from '../../src/config/env.ts';
import { localSeedPharmacy } from '../../src/local-seed.ts';
import {
  LOCAL_SEED_LOCATION_ID,
  LOCAL_SEED_OWNER_ID,
  LOCAL_SEED_TENANT_ID,
} from '../../src/local-seed.ts';
import { MemoryPlanGatingClient } from '../../src/plan-gating/client.ts';

const port = process.env.GO_LIVE_KYC_API_PORT ?? '3009';
const tokensPath = process.env.GO_LIVE_KYC_E2E_TOKENS_PATH ?? '/tmp/go-live-kyc-e2e-tokens.json';
const keys = await generateKeyPair('RS256');
const jwk = await exportJWK(keys.publicKey);
jwk.kid = 'kyc-e2e';
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
    .setProtectedHeader({ alg: 'RS256', kid: 'kyc-e2e' })
    .setIssuedAt()
    .setIssuer(issuer)
    .setAudience('namma-medmate-dispensary')
    .setExpirationTime('30m')
    .sign(keys.privateKey);
}

const pharmacy = await token({
  sub: LOCAL_SEED_OWNER_ID,
  principal_type: 'pharmacy',
  tenant_id: LOCAL_SEED_TENANT_ID,
  location_id: LOCAL_SEED_LOCATION_ID,
  role: 'owner',
});
const hq = await token({ sub: 'ops-1', principal_type: 'hq' });
writeFileSync(tokensPath, JSON.stringify({ pharmacy, hq }), 'utf8');

const env = loadGoLiveKycEnv({
  ...process.env,
  GO_LIVE_KYC_API_PORT: port,
  OIDC_ISSUER: issuer,
  OIDC_AUDIENCE: 'namma-medmate-dispensary',
  OIDC_JWKS_URI: `${issuer}/jwks.json`,
  LOG_LEVEL: 'error',
  GO_LIVE_KYC_PII_KEY: 'e2e-go-live-kyc-pii-key',
});

const auth = createMemoryAuthRepository();
await auth.createUser({
  userId: LOCAL_SEED_OWNER_ID,
  tenantId: LOCAL_SEED_TENANT_ID,
  locationId: LOCAL_SEED_LOCATION_ID,
  loginId: 'priya.owner',
  role: 'owner',
  passwordEnabled: true,
  otpEnabled: false,
  permissions: {},
});

listenLocal(
  createApp(env, {
    auth,
    tenancy: createMemoryTenancyRepository(localSeedPharmacy()),
    planGating: new MemoryPlanGatingClient(),
  }),
  Number(port),
  'go-live-kyc-api',
);
