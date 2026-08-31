import { createPool, ping } from '@namma-medmate/db-services';

const connectionString =
  process.env.DATABASE_URL ?? 'postgres://medmate:medmate@localhost:6432/medmate';

const pool = createPool(connectionString);
const ok = await ping(pool);
if (!ok) {
  throw new Error('Database ping failed');
}
process.stdout.write('local database reachable; no domain seed rows in this slice\n');
await pool.end();
