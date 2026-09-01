import { describe, expect, it, vi } from 'vitest';
import { encodeCursor } from '@namma-medmate/pagination-utils';
import {
  createMemoryMasterCatalogueRepository,
  createSqlMasterCatalogueRepository,
  GST_SLABS,
  SCHEDULES,
} from '../../src/index.ts';
import { clonePlatformMasterSku, cloneSubstitute } from '../../src/master-catalogue/clone.ts';
import type {
  CreatePlatformMasterSkuInput,
  PlatformMasterSkuRecord,
} from '../../src/master-catalogue/types.ts';

function seed(overrides: Partial<CreatePlatformMasterSkuInput> = {}): CreatePlatformMasterSkuInput {
  return {
    name: 'Paracetamol 500mg',
    composition: 'Paracetamol 500mg',
    manufacturer: 'Example Labs',
    brand: 'Calpol',
    pack: '10 tablets',
    form: 'tablet',
    category: 'Fever',
    schedule: 'OTC',
    rxOnly: false,
    hsn: '3004',
    gstSlab: 12,
    dpcoCeiling: '20.00',
    ...overrides,
  };
}

const sqlRow = {
  platform_master_sku_id: '11111111-1111-4111-8111-111111111111',
  name: 'Paracetamol 500mg',
  composition: 'Paracetamol 500mg',
  manufacturer: 'Example Labs',
  brand: 'Calpol',
  pack: '10 tablets',
  form: 'tablet',
  category: 'Fever',
  schedule: 'OTC' as const,
  rx_only: false,
  hsn: '3004',
  gst_slab: 12,
  dpco_ceiling: '20.00',
  banned: false,
  banned_at: null,
  banned_by_user_id: null,
  created_at: new Date('2026-09-01T00:00:00.000Z'),
  updated_at: new Date('2026-09-01T00:00:00.000Z'),
};

describe('memory master catalogue repository', () => {
  it('creates, lists with q and filters, and pages', async () => {
    const repo = createMemoryMasterCatalogueRepository();
    const created = await repo.createSku(
      seed({
        manufacturer: undefined,
        brand: undefined,
        pack: undefined,
        form: undefined,
        dpcoCeiling: undefined,
      }),
    );
    expect(created.manufacturer).toBeNull();
    expect(created.dpcoCeiling).toBeNull();
    const withCeiling = await repo.createSku(seed({ brand: 'Calpol' }));
    expect(withCeiling.dpcoCeiling).toBe('20.00');
    const listed = await repo.listSkus({ q: 'calpol', limit: 50 });
    expect(listed.items).toHaveLength(1);
    expect(listed.items[0]?.dpcoCeiling).toBe('20.00');
    await repo.createSku(
      seed({
        name: 'Azithromycin 500mg',
        composition: 'Azithromycin 500mg',
        category: 'Antibiotic',
        brand: null,
      }),
    );
    const filtered = await repo.listSkus({
      category: 'Fever',
      schedule: 'OTC',
      gstSlab: 12,
      rxOnly: false,
      banned: false,
      limit: 50,
    });
    expect(filtered.items.length).toBeGreaterThan(0);
    const page = await repo.listSkus({ limit: 1 });
    expect(page.items).toHaveLength(1);
    expect(page.nextCursor).toBeTruthy();
    const next = await repo.listSkus({ limit: 10, cursor: page.nextCursor ?? undefined });
    expect(next.items.length).toBeGreaterThan(0);
    await expect(repo.getById(created.platformMasterSkuId)).resolves.toMatchObject({
      name: 'Paracetamol 500mg',
    });
    await expect(repo.getById(crypto.randomUUID())).resolves.toBeUndefined();
    expect(GST_SLABS).toContain(12);
    expect(SCHEDULES).toContain('H1');
  });

  it('updates fields, ceiling, ban, unban, and substitutes', async () => {
    const repo = createMemoryMasterCatalogueRepository();
    const primary = await repo.createSku(seed());
    const alt = await repo.createSku(seed({ name: 'Paracetamol 500mg Generic', brand: null }));
    const patched = await repo.updateSku(primary.platformMasterSkuId, {
      category: 'Pain',
      manufacturer: null,
      brand: 'Calpol',
      pack: null,
      form: null,
      name: 'Paracetamol 500mg',
      composition: 'Paracetamol 500mg',
      schedule: 'OTC',
      rxOnly: false,
      hsn: '3004',
      gstSlab: 12,
    });
    expect(patched?.category).toBe('Pain');
    expect(patched?.manufacturer).toBeNull();
    const renamed = await repo.updateSku(primary.platformMasterSkuId, { name: 'Paracetamol cap' });
    expect(renamed?.name).toBe('Paracetamol cap');
    const hsnOnly = await repo.updateSku(primary.platformMasterSkuId, { hsn: '3004' });
    expect(hsnOnly?.hsn).toBe('3004');
    await expect(repo.listSubstitutes(primary.platformMasterSkuId)).resolves.toEqual([]);
    const ceiling = await repo.setCeiling(primary.platformMasterSkuId, '18.50');
    expect(ceiling?.dpcoCeiling).toBe('18.50');
    await repo.setCeiling(primary.platformMasterSkuId, null);
    const banned = await repo.ban(primary.platformMasterSkuId, 'ops-1');
    expect(banned?.banned).toBe(true);
    expect(banned?.bannedByUserId).toBe('ops-1');
    const unbanned = await repo.unban(primary.platformMasterSkuId);
    expect(unbanned?.banned).toBe(false);
    expect(unbanned?.bannedAt).toBeNull();
    const subs = await repo.replaceSubstitutes(primary.platformMasterSkuId, [
      alt.platformMasterSkuId,
    ]);
    expect(subs).toHaveLength(1);
    expect(subs[0]?.name).toContain('Generic');
    await repo.ban(alt.platformMasterSkuId, 'ops-1');
    const forPos = await repo.listSubstitutes(primary.platformMasterSkuId, true);
    expect(forPos).toHaveLength(0);
    const stored = await repo.listSubstitutes(primary.platformMasterSkuId);
    expect(stored).toHaveLength(1);
    await expect(repo.updateSku(crypto.randomUUID(), { name: 'x' })).resolves.toBeUndefined();
    await expect(repo.setCeiling(crypto.randomUUID(), '1.00')).resolves.toBeUndefined();
    await expect(repo.ban(crypto.randomUUID(), 'ops')).resolves.toBeUndefined();
    await expect(repo.unban(crypto.randomUUID())).resolves.toBeUndefined();
    const found = await repo.getByIds([primary.platformMasterSkuId, crypto.randomUUID()]);
    expect(found).toHaveLength(1);
  });

  it('clones sku and substitute rows', () => {
    const now = new Date();
    const row: PlatformMasterSkuRecord = {
      platformMasterSkuId: crypto.randomUUID(),
      name: 'X',
      composition: 'X',
      manufacturer: null,
      brand: null,
      pack: null,
      form: null,
      category: 'Fever',
      schedule: 'OTC',
      rxOnly: false,
      hsn: '3004',
      gstSlab: 12,
      dpcoCeiling: '1.00',
      banned: false,
      bannedAt: now,
      bannedByUserId: 'ops',
      createdAt: now,
      updatedAt: now,
    };
    const cloned = clonePlatformMasterSku(row);
    cloned.name = 'Y';
    expect(row.name).toBe('X');
    const empty = clonePlatformMasterSku({ ...row, bannedAt: null });
    expect(empty.bannedAt).toBeNull();
    expect(
      cloneSubstitute({
        platformMasterSkuId: 'a',
        name: 'n',
        schedule: 'OTC',
        banned: false,
        sortOrder: 0,
      }).sortOrder,
    ).toBe(0);
  });

  it('filters rx-only, banned, and misses unmatched search', async () => {
    const repo = createMemoryMasterCatalogueRepository();
    await repo.createSku(seed({ name: 'Amoxicillin', schedule: 'H', rxOnly: true, brand: 'Mox' }));
    const rx = await repo.listSkus({ rxOnly: true, limit: 10 });
    expect(rx.items).toHaveLength(1);
    const rxOff = await repo.listSkus({ rxOnly: false, limit: 10 });
    expect(rxOff.items).toHaveLength(0);
    const sameA = await repo.createSku(
      seed({ name: 'Same', composition: 'Same A', brand: 'BrandQ' }),
    );
    const sameB = await repo.createSku(seed({ name: 'Same', composition: 'Same B', brand: null }));
    const sameNamed = await repo.listSkus({ q: 'brandq', limit: 10 });
    expect(sameNamed.items).toHaveLength(1);
    await repo.replaceSubstitutes(sameA.platformMasterSkuId, [
      crypto.randomUUID(),
      sameB.platformMasterSkuId,
    ]);
    const dangling = await repo.listSubstitutes(sameA.platformMasterSkuId);
    expect(dangling).toHaveLength(1);
    const otcOnly = await repo.listSkus({ rxOnly: false, limit: 10 });
    expect(otcOnly.items.length).toBeGreaterThan(0);
    const rxSkipOtc = await repo.listSkus({ rxOnly: true, limit: 10 });
    expect(rxSkipOtc.items.every((row) => row.rxOnly)).toBe(true);
    await expect(repo.listSkus({ q: 'no-such', limit: 10 })).resolves.toMatchObject({ items: [] });
    await expect(repo.listSkus({ category: 'Cough', limit: 10 })).resolves.toMatchObject({
      items: [],
    });
    await expect(repo.listSkus({ schedule: 'X', limit: 10 })).resolves.toMatchObject({ items: [] });
    await expect(repo.listSkus({ gstSlab: 5, limit: 10 })).resolves.toMatchObject({ items: [] });
    await expect(repo.listSkus({ banned: true, limit: 10 })).resolves.toMatchObject({ items: [] });
    const mixed = await repo.listSkus({ limit: 10 });
    expect(mixed.items.length).toBeGreaterThan(1);
  });
});

describe('sql master catalogue repository', () => {
  function mockPool(query: ReturnType<typeof vi.fn>) {
    return { query };
  }

  it('inserts, finds, lists, and updates through parameterized SQL', async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql.startsWith('insert into platform_master_skus')) {
        return { rows: [sqlRow] };
      }
      if (sql.startsWith('update')) {
        return { rows: [{ ...sqlRow, category: 'Pain', dpco_ceiling: '18.5' }] };
      }
      if (sql.includes('order by name')) {
        return { rows: [sqlRow, { ...sqlRow, platform_master_sku_id: crypto.randomUUID() }] };
      }
      if (sql.includes('where platform_master_sku_id = any')) {
        return { rows: [sqlRow] };
      }
      if (sql.includes('where platform_master_sku_id')) {
        return { rows: [sqlRow] };
      }
      return { rows: [] };
    });
    const repo = createSqlMasterCatalogueRepository(mockPool(query) as never);
    const created = await repo.createSku(
      seed({
        manufacturer: undefined,
        brand: undefined,
        pack: undefined,
        form: undefined,
        dpcoCeiling: undefined,
      }),
    );
    expect(created.platformMasterSkuId).toBe(sqlRow.platform_master_sku_id);
    expect(created.dpcoCeiling).toBe('20.00');
    await expect(repo.getById(sqlRow.platform_master_sku_id)).resolves.toMatchObject({
      name: 'Paracetamol 500mg',
    });
    const listed = await repo.listSkus({
      category: 'Fever',
      schedule: 'OTC',
      gstSlab: 12,
      banned: false,
      rxOnly: false,
      q: 'Para',
      cursor: encodeCursor(sqlRow.platform_master_sku_id),
      limit: 1,
    });
    expect(listed.items).toHaveLength(1);
    expect(listed.nextCursor).toBeTruthy();
    const patched = await repo.updateSku(sqlRow.platform_master_sku_id, {
      category: 'Pain',
      manufacturer: null,
      brand: 'Calpol',
      pack: null,
      form: null,
    });
    expect(patched?.category).toBe('Pain');
    await repo.updateSku(sqlRow.platform_master_sku_id, { name: 'Renamed' });
    const ceiling = await repo.setCeiling(sqlRow.platform_master_sku_id, '18.50');
    expect(ceiling?.dpcoCeiling).toBe('18.50');
    await repo.ban(sqlRow.platform_master_sku_id, 'ops-1');
    await repo.unban(sqlRow.platform_master_sku_id);
    const ids = await repo.getByIds([sqlRow.platform_master_sku_id]);
    expect(ids).toHaveLength(1);
    await expect(repo.getByIds([])).resolves.toEqual([]);
  });

  it('throws when insert returns no row and lists rx-only / unfiltered', async () => {
    const empty = createSqlMasterCatalogueRepository(
      mockPool(vi.fn(async () => ({ rows: [] }))) as never,
    );
    await expect(empty.createSku(seed())).rejects.toThrow(
      'Platform master SKU insert did not persist',
    );
    const query = vi.fn(async (sql: string) => {
      if (sql.includes('rx_only = true')) {
        return { rows: [{ ...sqlRow, rx_only: true, schedule: 'H' }] };
      }
      if (sql.includes('rx_only = false')) {
        return { rows: [sqlRow] };
      }
      return { rows: [sqlRow] };
    });
    const repo = createSqlMasterCatalogueRepository(mockPool(query) as never);
    const rx = await repo.listSkus({ rxOnly: true, limit: 10 });
    expect(rx.items[0]?.rxOnly).toBe(true);
    const rxOff = await repo.listSkus({ rxOnly: false, limit: 10 });
    expect(rxOff.items[0]?.rxOnly).toBe(false);
    const all = await repo.listSkus({ limit: 10 });
    expect(all.nextCursor).toBeNull();
    const nullCeil = createSqlMasterCatalogueRepository(
      mockPool(vi.fn(async () => ({ rows: [{ ...sqlRow, dpco_ceiling: null }] }))) as never,
    );
    await expect(nullCeil.getById(sqlRow.platform_master_sku_id)).resolves.toMatchObject({
      dpcoCeiling: null,
    });
  });

  it('replaces substitutes in a transaction and filters for POS', async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql === 'begin' || sql === 'commit' || sql === 'rollback' || sql.startsWith('delete')) {
        return { rows: [] };
      }
      if (sql.startsWith('insert into platform_master_sku_substitutes')) {
        return { rows: [] };
      }
      if (sql.includes('sku.banned = false')) {
        return { rows: [] };
      }
      return {
        rows: [
          {
            substitute_platform_master_sku_id: '22222222-2222-4222-8222-222222222222',
            name: 'Generic',
            schedule: 'OTC',
            banned: true,
            sort_order: 0,
          },
        ],
      };
    });
    const repo = createSqlMasterCatalogueRepository(mockPool(query) as never);
    const stored = await repo.replaceSubstitutes(sqlRow.platform_master_sku_id, [
      '22222222-2222-4222-8222-222222222222',
    ]);
    expect(stored[0]?.banned).toBe(true);
    const forPos = await repo.listSubstitutes(sqlRow.platform_master_sku_id, true);
    expect(forPos).toHaveLength(0);
  });

  it('rolls back substitute writes on failure', async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql === 'begin' || sql === 'rollback' || sql.startsWith('delete')) {
        return { rows: [] };
      }
      if (sql.startsWith('insert into platform_master_sku_substitutes')) {
        throw new Error('fk');
      }
      return { rows: [] };
    });
    const repo = createSqlMasterCatalogueRepository(mockPool(query) as never);
    await expect(
      repo.replaceSubstitutes(sqlRow.platform_master_sku_id, [
        '22222222-2222-4222-8222-222222222222',
      ]),
    ).rejects.toThrow('fk');
    expect(query).toHaveBeenCalledWith('rollback');
  });

  it('returns undefined for missing update targets', async () => {
    const query = vi.fn(async () => ({ rows: [] }));
    const repo = createSqlMasterCatalogueRepository(mockPool(query) as never);
    await expect(repo.updateSku(crypto.randomUUID(), { name: 'x' })).resolves.toBeUndefined();
  });
});
