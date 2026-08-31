import { listenLocal } from '@namma-medmate/lambda-bootstrap';
import {
  applySqlMigrations,
  createMemoryAuditRepository,
  createMemoryTenancyRepository,
  createPool,
  createSqlAuditRepository,
  createSqlTenancyRepository,
} from '@namma-medmate/db-services';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.ts';
import { loadAuditEnv } from './config/env.ts';
import { localSeedPharmacy } from './local-seed.ts';

const env = loadAuditEnv();
const tenancy = createMemoryTenancyRepository(localSeedPharmacy());
const events = createMemoryAuditRepository();

if (env.AUDIT_PERSISTENCE === 'postgres' && env.DATABASE_URL) {
  const pool = createPool(env.DATABASE_URL);
  const directory = join(
    dirname(fileURLToPath(import.meta.url)),
    '../../../../libs/db-services/src/migrations',
  );
  await applySqlMigrations(pool, directory);
  listenLocal(
    createApp(env, {
      tenancy: createSqlTenancyRepository(pool),
      events: createSqlAuditRepository(pool),
    }),
    env.AUDIT_API_PORT,
    'audit-api',
  );
} else {
  listenLocal(createApp(env, { tenancy, events }), env.AUDIT_API_PORT, 'audit-api');
}
