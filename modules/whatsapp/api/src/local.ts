import { listenLocal } from '@namma-medmate/lambda-bootstrap';
import {
  applySqlMigrations,
  createMemoryTenancyRepository,
  createMemoryWhatsAppRepository,
  createPool,
  createSqlTenancyRepository,
  createSqlWhatsAppRepository,
} from '@namma-medmate/db-services';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.ts';
import { loadWhatsAppEnv } from './config/env.ts';
import { localSeedPharmacy } from './local-seed.ts';
import { MemoryMetaClient } from './meta/memory-client.ts';

const env = loadWhatsAppEnv();
const tenancy = createMemoryTenancyRepository(localSeedPharmacy());
const messages = createMemoryWhatsAppRepository();
const meta = new MemoryMetaClient();

if (env.WHATSAPP_PERSISTENCE === 'postgres' && env.DATABASE_URL) {
  const pool = createPool(env.DATABASE_URL);
  const directory = join(
    dirname(fileURLToPath(import.meta.url)),
    '../../../../libs/db-services/src/migrations',
  );
  await applySqlMigrations(pool, directory);
  listenLocal(
    createApp(env, {
      tenancy: createSqlTenancyRepository(pool),
      messages: createSqlWhatsAppRepository(pool),
      meta,
    }),
    env.WHATSAPP_API_PORT,
    'whatsapp-api',
  );
} else {
  listenLocal(createApp(env, { tenancy, messages, meta }), env.WHATSAPP_API_PORT, 'whatsapp-api');
}
