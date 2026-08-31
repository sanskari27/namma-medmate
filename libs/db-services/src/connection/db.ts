import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import * as schema from '../schema/index.ts';

export type Database = NodePgDatabase<typeof schema>;

export function createDb(pool: Pool): Database {
  return drizzle(pool, { schema });
}

export async function ping(pool: Pool): Promise<boolean> {
  const result = await pool.query<{ ok: number }>('select 1 as ok');
  return result.rows[0]?.ok === 1;
}
