import { listenLocal } from '@namma-medmate/lambda-bootstrap';
import {
  applySqlMigrations,
  createMemoryTenancyRepository,
  createPharmacySessionLookup,
  createPool,
  createSqlAuthRepository,
  createSqlTenancyRepository,
} from '@namma-medmate/db-services';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.ts';
import { loadTenancyEnv } from './config/env.ts';

const env = loadTenancyEnv();
const repository = createMemoryTenancyRepository();

if (env.TENANCY_PERSISTENCE === 'postgres' && env.DATABASE_URL) {
  const pool = createPool(env.DATABASE_URL);
  const directory = join(
    dirname(fileURLToPath(import.meta.url)),
    '../../../../libs/db-services/src/migrations',
  );
  await applySqlMigrations(pool, directory);
  const auth = createSqlAuthRepository(pool);
  listenLocal(
    createApp(env, createSqlTenancyRepository(pool), createPharmacySessionLookup(auth)),
    env.TENANCY_API_PORT,
    'tenancy-api',
  );
} else {
  listenLocal(createApp(env, repository), env.TENANCY_API_PORT, 'tenancy-api');
}
