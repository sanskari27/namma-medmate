import { listenLocal } from '@namma-medmate/lambda-bootstrap';
import {
  applySqlMigrations,
  createMemoryMasterCatalogueRepository,
  createMemoryTenancyRepository,
  createPharmacySessionLookup,
  createPool,
  createSqlAuthRepository,
  createSqlMasterCatalogueRepository,
  createSqlTenancyRepository,
} from '@namma-medmate/db-services';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.ts';
import { loadMasterCatalogueEnv } from './config/env.ts';
import { localSeedPharmacy } from './local-seed.ts';

const env = loadMasterCatalogueEnv();
const tenancy = createMemoryTenancyRepository(localSeedPharmacy());
const catalogue = createMemoryMasterCatalogueRepository();

if (env.MASTER_CATALOGUE_PERSISTENCE === 'postgres' && env.DATABASE_URL) {
  const pool = createPool(env.DATABASE_URL);
  const directory = join(
    dirname(fileURLToPath(import.meta.url)),
    '../../../../libs/db-services/src/migrations',
  );
  await applySqlMigrations(pool, directory);
  listenLocal(
    createApp(env, {
      tenancy: createSqlTenancyRepository(pool),
      catalogue: createSqlMasterCatalogueRepository(pool),
      lookupPharmacySession: createPharmacySessionLookup(createSqlAuthRepository(pool)),
    }),
    env.MASTER_CATALOGUE_API_PORT,
    'master-catalogue-api',
  );
} else {
  listenLocal(
    createApp(env, { tenancy, catalogue }),
    env.MASTER_CATALOGUE_API_PORT,
    'master-catalogue-api',
  );
}
