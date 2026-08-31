import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { applySqlMigrations, createDb, createPool, ping } from '../../src/index.ts';

describe('db-services', () => {
  it('creates a pool with conservative defaults', () => {
    const pool = createPool('postgres://medmate:medmate@localhost:6432/medmate');
    expect(pool.options.max).toBe(5);
    expect(pool.options.connectionString).toContain('6432');
    void pool.end();
  });

  it('pings through the pool and maps the result', async () => {
    const pool = {
      query: vi.fn().mockResolvedValue({ rows: [{ ok: 1 }] }),
    };
    expect(await ping(pool as never)).toBe(true);
    pool.query.mockResolvedValue({ rows: [{}] });
    expect(await ping(pool as never)).toBe(false);
  });

  it('creates a drizzle database wrapper', () => {
    const db = createDb({} as never);
    expect(db).toBeTruthy();
  });

  it('applies new sql migrations and skips already applied files', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'nm-mig-'));
    await writeFile(join(directory, '0001_init.sql'), 'select 1;', 'utf8');
    const calls: string[] = [];
    const pool = {
      query: vi.fn(async (sql: string) => {
        calls.push(sql);
        if (sql.startsWith('select 1 from schema_migrations')) {
          const inserts = calls.filter((item) =>
            item.startsWith('insert into schema_migrations'),
          ).length;
          return { rowCount: inserts === 0 ? undefined : inserts };
        }
        return { rowCount: 0, rows: [] };
      }),
    };
    const first = await applySqlMigrations(pool as never, directory);
    const second = await applySqlMigrations(pool as never, directory);
    expect(first).toEqual(['0001_init.sql']);
    expect(second).toEqual([]);
  });
});
