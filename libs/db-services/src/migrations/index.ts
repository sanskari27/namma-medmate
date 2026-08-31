import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Pool } from 'pg';

export async function applySqlMigrations(pool: Pool, directory: string): Promise<string[]> {
  const files = (await readdir(directory)).filter((file) => file.endsWith('.sql')).sort();
  const applied: string[] = [];
  await pool.query(
    'create table if not exists schema_migrations (id text primary key, applied_at timestamptz not null default now())',
  );
  for (const file of files) {
    const existing = await pool.query('select 1 from schema_migrations where id = $1', [file]);
    if ((existing.rowCount ?? 0) > 0) {
      continue;
    }
    const sql = await readFile(join(directory, file), 'utf8');
    await pool.query(sql);
    await pool.query('insert into schema_migrations (id) values ($1)', [file]);
    applied.push(file);
  }
  return applied;
}
