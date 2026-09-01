import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listenLocal } from '@namma-medmate/lambda-bootstrap';
import {
  applySqlMigrations,
  createMemoryAuthRepository,
  createPool,
  createSqlAuthRepository,
} from '@namma-medmate/db-services';
import { createApp } from './app.ts';
import { loadAuthEnv } from './config/env.ts';
import { seedAuthUsers } from './local-seed.ts';

const env = loadAuthEnv();

if (env.AUTH_PERSISTENCE === 'postgres' && env.DATABASE_URL) {
  const pool = createPool(env.DATABASE_URL);
  const directory = join(
    dirname(fileURLToPath(import.meta.url)),
    '../../../../libs/db-services/src/migrations',
  );
  await applySqlMigrations(pool, directory);
  const auth = createSqlAuthRepository(pool);
  await seedAuthUsers(auth).catch(() => undefined);
  listenLocal(createApp(env, { auth }), env.AUTH_API_PORT, 'auth-api');
} else {
  const auth = createMemoryAuthRepository();
  await seedAuthUsers(auth);
  listenLocal(createApp(env, { auth }), env.AUTH_API_PORT, 'auth-api');
}
