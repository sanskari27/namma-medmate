import { describe, expect, it, vi } from 'vitest';
import { AppError } from '@namma-medmate/error-handling';
import { ErrorCode } from '@namma-medmate/constants';
import { encodeCursor } from '@namma-medmate/pagination-utils';
import {
  BUSINESS_TYPE_RETAIL,
  GST_DEALER_TYPE_REGULAR,
  createMemoryTenancyRepository,
  createSqlTenancyRepository,
  getLocationForTenant,
  isUniqueViolation,
  mapTenancyPersistenceError,
} from '../../src/index.ts';

const DISPLAY = 'Sri Krishna Medicals';

describe('memory tenancy repository', () => {
  it('creates a pharmacy with one location and looks it up', async () => {
    const repo = createMemoryTenancyRepository();
    const created = await repo.createPharmacyWithLocation({
      displayName: DISPLAY,
      gstDealerType: GST_DEALER_TYPE_REGULAR,
      businessType: BUSINESS_TYPE_RETAIL,
    });
    expect(created.location.displayName).toBe(DISPLAY);
    expect(created.location.tenantId).toBe(created.tenantId);
    await expect(repo.getPharmacyByTenantId(created.tenantId)).resolves.toMatchObject({
      tenantId: created.tenantId,
    });
    await expect(getLocationForTenant(repo, created.tenantId)).resolves.toMatchObject({
      locationId: created.location.locationId,
    });
    await expect(repo.getLocationById(created.location.locationId)).resolves.toMatchObject({
      displayName: DISPLAY,
    });
    await expect(repo.getPharmacyByTenantId(crypto.randomUUID())).resolves.toBeUndefined();
    await expect(repo.getLocationById(crypto.randomUUID())).resolves.toBeUndefined();
    await expect(getLocationForTenant(repo, crypto.randomUUID())).resolves.toBeUndefined();
  });

  it('accepts a seeded pharmacy record', async () => {
    const tenantId = crypto.randomUUID();
    const locationId = crypto.randomUUID();
    const now = new Date();
    const repo = createMemoryTenancyRepository({
      tenantId,
      gstDealerType: GST_DEALER_TYPE_REGULAR,
      businessType: BUSINESS_TYPE_RETAIL,
      createdAt: now,
      updatedAt: now,
      location: {
        locationId,
        tenantId,
        displayName: DISPLAY,
        createdAt: now,
        updatedAt: now,
      },
    });
    await expect(repo.getPharmacyByTenantId(tenantId)).resolves.toMatchObject({ tenantId });
  });

  it('pages pharmacies and ignores a tampered cursor', async () => {
    const repo = createMemoryTenancyRepository();
    for (const name of ['A', 'B', 'C']) {
      await repo.createPharmacyWithLocation({
        displayName: name,
        gstDealerType: GST_DEALER_TYPE_REGULAR,
        businessType: BUSINESS_TYPE_RETAIL,
      });
    }
    const first = await repo.listPharmacies({ limit: 2 });
    expect(first.items).toHaveLength(2);
    expect(first.nextCursor).toBeTruthy();
    const second = await repo.listPharmacies({ limit: 2, cursor: first.nextCursor ?? undefined });
    expect(second.items.length).toBeGreaterThanOrEqual(1);
    const ignored = await repo.listPharmacies({ limit: 10, cursor: 'not-valid' });
    expect(ignored.items.length).toBe(3);
  });

  it('updates display name and rejects unknown or mismatched locations', async () => {
    const repo = createMemoryTenancyRepository();
    const created = await repo.createPharmacyWithLocation({
      displayName: DISPLAY,
      gstDealerType: GST_DEALER_TYPE_REGULAR,
      businessType: BUSINESS_TYPE_RETAIL,
    });
    const updated = await repo.updateLocationDisplayName({
      tenantId: created.tenantId,
      locationId: created.location.locationId,
      displayName: 'Sri Krishna Medicals Indiranagar',
    });
    expect(updated.location.displayName).toBe('Sri Krishna Medicals Indiranagar');
    await expect(
      repo.updateLocationDisplayName({
        tenantId: crypto.randomUUID(),
        locationId: created.location.locationId,
        displayName: 'Nope',
      }),
    ).rejects.toMatchObject({ code: ErrorCode.PHARMACY_NOT_FOUND });
    await expect(
      repo.updateLocationDisplayName({
        tenantId: created.tenantId,
        locationId: crypto.randomUUID(),
        displayName: 'Nope',
      }),
    ).rejects.toMatchObject({ code: ErrorCode.LOCATION_TENANT_MISMATCH });
  });
});

describe('tenancy persistence errors', () => {
  it('maps unique violations to LOCATION_LIMIT_V1 and rethrows other errors', () => {
    expect(isUniqueViolation({ code: '23505' })).toBe(true);
    expect(isUniqueViolation({ code: '57014' })).toBe(false);
    expect(isUniqueViolation('nope')).toBe(false);
    expect(() => mapTenancyPersistenceError({ code: '23505' })).toThrow(AppError);
    expect(() => mapTenancyPersistenceError(new Error('disk'))).toThrow('disk');
  });
});

const pharmacyRow = {
  tenant_id: '8f1c0a7e-2b3d-4e5f-8a90-123456789abc',
  gst_dealer_type: 'regular' as const,
  business_type: 'retail' as const,
  created_at: new Date('2026-08-31T16:00:00.000Z'),
  updated_at: new Date('2026-08-31T16:00:00.000Z'),
  location_id: '1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809',
  display_name: DISPLAY,
  location_created_at: new Date('2026-08-31T16:00:00.000Z'),
  location_updated_at: new Date('2026-08-31T16:00:00.000Z'),
};

function mockPool(query: ReturnType<typeof vi.fn>, clientQuery?: ReturnType<typeof vi.fn>) {
  const client = {
    query: clientQuery ?? query,
    release: vi.fn(),
  };
  return {
    query,
    connect: vi.fn().mockResolvedValue(client),
    client,
  };
}

describe('sql tenancy repository', () => {
  it('creates pharmacy and location in one transaction', async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql.includes('select p.tenant_id')) {
        return { rows: [pharmacyRow] };
      }
      return { rows: [] };
    });
    const pool = mockPool(query);
    const repo = createSqlTenancyRepository(pool as never);
    const created = await repo.createPharmacyWithLocation({
      displayName: DISPLAY,
      gstDealerType: GST_DEALER_TYPE_REGULAR,
      businessType: BUSINESS_TYPE_RETAIL,
    });
    expect(created.tenantId).toBe(pharmacyRow.tenant_id);
    expect(pool.client.release).toHaveBeenCalled();
  });

  it('maps unique violations on create to LOCATION_LIMIT_V1', async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql.startsWith('insert into pharmacies')) {
        throw { code: '23505' };
      }
      return { rows: [] };
    });
    const pool = mockPool(query);
    const repo = createSqlTenancyRepository(pool as never);
    await expect(
      repo.createPharmacyWithLocation({
        displayName: DISPLAY,
        gstDealerType: GST_DEALER_TYPE_REGULAR,
        businessType: BUSINESS_TYPE_RETAIL,
      }),
    ).rejects.toMatchObject({ code: ErrorCode.LOCATION_LIMIT_V1 });
  });

  it('fails if create cannot re-read both rows', async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql.includes('select p.tenant_id')) {
        return { rows: [] };
      }
      return { rows: [] };
    });
    const pool = mockPool(query);
    const repo = createSqlTenancyRepository(pool as never);
    await expect(
      repo.createPharmacyWithLocation({
        displayName: DISPLAY,
        gstDealerType: GST_DEALER_TYPE_REGULAR,
        businessType: BUSINESS_TYPE_RETAIL,
      }),
    ).rejects.toThrow('Pharmacy create did not persist both rows');
  });

  it('reads, lists, and updates through parameterized SQL', async () => {
    const query = vi.fn(async (sql: string, params?: unknown[]) => {
      if (sql.includes('where p.tenant_id > $1')) {
        return { rows: [pharmacyRow] };
      }
      if (sql.includes('order by p.tenant_id asc limit $1')) {
        return { rows: [pharmacyRow, { ...pharmacyRow, tenant_id: crypto.randomUUID() }] };
      }
      if (sql.includes('where l.location_id')) {
        if (params?.[0] === pharmacyRow.location_id) {
          return { rows: [pharmacyRow] };
        }
        return { rows: [] };
      }
      if (sql.startsWith('update')) {
        return { rows: [] };
      }
      if (sql.includes('where p.tenant_id = $1')) {
        if (params?.[0] === 'missing') {
          return { rows: [] };
        }
        return { rows: [pharmacyRow] };
      }
      return { rows: [pharmacyRow] };
    });
    const pool = mockPool(query);
    const repo = createSqlTenancyRepository(pool as never);
    await expect(repo.getPharmacyByTenantId(pharmacyRow.tenant_id)).resolves.toMatchObject({
      tenantId: pharmacyRow.tenant_id,
    });
    await expect(repo.getPharmacyByTenantId('missing')).resolves.toBeUndefined();
    await expect(repo.getLocationById(pharmacyRow.location_id)).resolves.toMatchObject({
      displayName: DISPLAY,
    });
    await expect(repo.getLocationById(crypto.randomUUID())).resolves.toBeUndefined();
    await expect(repo.getLocationForTenant(pharmacyRow.tenant_id)).resolves.toMatchObject({
      tenantId: pharmacyRow.tenant_id,
    });
    const paged = await repo.listPharmacies({ limit: 1 });
    expect(paged.items).toHaveLength(1);
    expect(paged.nextCursor).toBeTruthy();
    const full = await repo.listPharmacies({ limit: 10 });
    expect(full.nextCursor).toBeNull();
    const next = await repo.listPharmacies({
      limit: 1,
      cursor: encodeCursor(pharmacyRow.tenant_id),
    });
    expect(next.items).toHaveLength(1);
    const updated = await repo.updateLocationDisplayName({
      tenantId: pharmacyRow.tenant_id,
      locationId: pharmacyRow.location_id,
      displayName: 'Renamed',
    });
    expect(updated.location.displayName).toBe(DISPLAY);
    await expect(
      repo.updateLocationDisplayName({
        tenantId: 'missing',
        locationId: pharmacyRow.location_id,
        displayName: 'x',
      }),
    ).rejects.toMatchObject({ code: ErrorCode.PHARMACY_NOT_FOUND });
  });

  it('rejects location mismatch and a vanished row after update', async () => {
    let selects = 0;
    const query = vi.fn(async (sql: string) => {
      if (sql.includes('where p.tenant_id = $1') && !sql.startsWith('update')) {
        selects += 1;
        if (selects === 1) {
          return { rows: [pharmacyRow] };
        }
        return { rows: [] };
      }
      if (sql.includes('where p.tenant_id = $1')) {
        return { rows: [{ ...pharmacyRow, location_id: crypto.randomUUID() }] };
      }
      return { rows: [] };
    });
    const mismatchPool = mockPool(
      vi.fn(async (sql: string) => {
        if (sql.includes('where p.tenant_id = $1')) {
          return { rows: [{ ...pharmacyRow, location_id: crypto.randomUUID() }] };
        }
        return { rows: [] };
      }),
    );
    await expect(
      createSqlTenancyRepository(mismatchPool as never).updateLocationDisplayName({
        tenantId: pharmacyRow.tenant_id,
        locationId: pharmacyRow.location_id,
        displayName: 'x',
      }),
    ).rejects.toMatchObject({ code: ErrorCode.LOCATION_TENANT_MISMATCH });

    const vanished = mockPool(query);
    await expect(
      createSqlTenancyRepository(vanished as never).updateLocationDisplayName({
        tenantId: pharmacyRow.tenant_id,
        locationId: pharmacyRow.location_id,
        displayName: 'x',
      }),
    ).rejects.toMatchObject({ code: ErrorCode.PHARMACY_NOT_FOUND });
  });

  it('returns undefined when a location join misses', async () => {
    const query = vi.fn(async () => ({ rows: [] }));
    const repo = createSqlTenancyRepository(mockPool(query) as never);
    await expect(repo.getLocationById(pharmacyRow.location_id)).resolves.toBeUndefined();
    await expect(repo.getLocationForTenant(pharmacyRow.tenant_id)).resolves.toBeUndefined();
  });
});
