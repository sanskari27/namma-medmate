import { describe, expect, it, vi } from 'vitest';
import { encodeCursor } from '@namma-medmate/pagination-utils';
import {
  ACTOR_SURFACES,
  createMemoryAuditRepository,
  createSqlAuditRepository,
} from '../../src/index.ts';
import { cloneAuditEvent } from '../../src/audit/clone.ts';
import type { AuditEventRecord, InsertAuditEventInput } from '../../src/audit/types.ts';

const TENANT = '8f1c0a7e-2b3d-4e5f-8a90-123456789abc';
const LOCATION = '1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809';

function seed(overrides: Partial<InsertAuditEventInput> = {}): InsertAuditEventInput {
  return {
    idempotencyKey: 'key-1',
    tenantId: TENANT,
    locationId: LOCATION,
    actorUserId: 'user-111',
    actorRole: 'Pharmacist',
    actorSurface: 'pharmacy',
    action: 'bill_posted',
    targetType: 'Bill',
    targetId: 'INV-24-00018',
    moneyOrStock: true,
    before: { batch_qty: { 'SKU1:B1': 10 } },
    after: { batch_qty: { 'SKU1:B1': 8 } },
    ...overrides,
  };
}

const sqlRow = {
  audit_event_id: '9d9d9d9d-0000-4111-8222-333344445555',
  idempotency_key: 'key-1',
  tenant_id: TENANT,
  location_id: LOCATION,
  actor_user_id: 'user-111',
  actor_role: 'Pharmacist',
  actor_surface: 'pharmacy' as const,
  action: 'bill_posted',
  target_type: 'Bill',
  target_id: 'INV-24-00018',
  money_or_stock: true,
  before: { batch_qty: { 'SKU1:B1': 10 } },
  after: { batch_qty: { 'SKU1:B1': 8 } },
  occurred_at: new Date('2026-08-31T12:00:00.120Z'),
  client_occurred_at: null,
  request_id: null,
  created_at: new Date('2026-08-31T12:00:00.120Z'),
};

describe('memory audit repository', () => {
  it('inserts, dedupes, finds, and pages newest first', async () => {
    const repo = createMemoryAuditRepository();
    const first = await repo.insertEvent(seed());
    expect(first.deduped).toBe(false);
    const again = await repo.insertEvent(seed());
    expect(again.deduped).toBe(true);
    expect(again.record.auditEventId).toBe(first.record.auditEventId);
    await expect(repo.findById(first.record.auditEventId)).resolves.toMatchObject({
      targetId: 'INV-24-00018',
    });
    await expect(repo.findById(crypto.randomUUID())).resolves.toBeUndefined();
    await expect(repo.findByIdempotencyKey('key-1')).resolves.toMatchObject({
      auditEventId: first.record.auditEventId,
    });
    await expect(repo.findByIdempotencyKey('missing')).resolves.toBeUndefined();
    await repo.insertEvent(
      seed({ idempotencyKey: 'duty', action: 'duty_clock_in', moneyOrStock: false }),
    );
    const page = await repo.listEvents({ tenantId: TENANT, locationId: LOCATION, limit: 1 });
    expect(page.items).toHaveLength(1);
    expect(page.nextCursor).toBeTruthy();
    const next = await repo.listEvents({
      tenantId: TENANT,
      locationId: LOCATION,
      limit: 10,
      cursor: page.nextCursor ?? undefined,
    });
    expect(next.items).toHaveLength(1);
    const filtered = await repo.listEvents({
      tenantId: TENANT,
      locationId: LOCATION,
      action: 'duty_clock_in',
      actorUserId: 'user-111',
      targetType: 'Bill',
      targetId: 'INV-24-00018',
      from: new Date('2000-01-01T00:00:00.000Z'),
      to: new Date('2099-01-01T00:00:00.000Z'),
      limit: 10,
    });
    expect(filtered.items).toHaveLength(1);
    await expect(
      repo.listEvents({ tenantId: crypto.randomUUID(), locationId: LOCATION, limit: 10 }),
    ).resolves.toMatchObject({ items: [] });
    await expect(
      repo.listEvents({ tenantId: TENANT, locationId: crypto.randomUUID(), limit: 10 }),
    ).resolves.toMatchObject({ items: [] });
    await expect(
      repo.listEvents({ tenantId: TENANT, locationId: LOCATION, actorUserId: 'nope', limit: 10 }),
    ).resolves.toMatchObject({ items: [] });
    await expect(
      repo.listEvents({ tenantId: TENANT, locationId: LOCATION, targetType: 'GRN', limit: 10 }),
    ).resolves.toMatchObject({ items: [] });
    await expect(
      repo.listEvents({ tenantId: TENANT, locationId: LOCATION, targetId: 'nope', limit: 10 }),
    ).resolves.toMatchObject({ items: [] });
    await expect(
      repo.listEvents({
        tenantId: TENANT,
        locationId: LOCATION,
        from: new Date('2099-01-01T00:00:00.000Z'),
        limit: 10,
      }),
    ).resolves.toMatchObject({ items: [] });
    await expect(
      repo.listEvents({
        tenantId: TENANT,
        locationId: LOCATION,
        to: new Date('2000-01-01T00:00:00.000Z'),
        limit: 10,
      }),
    ).resolves.toMatchObject({ items: [] });
    const bare = await repo.insertEvent({
      tenantId: TENANT,
      locationId: LOCATION,
      actorUserId: 'u',
      actorRole: 'Owner',
      actorSurface: 'pharmacy',
      action: 'login_succeeded',
      targetType: 'User',
      targetId: 'u',
      moneyOrStock: false,
    });
    expect(bare.record.before).toBeNull();
    expect(bare.record.idempotencyKey).toBeNull();
  });

  it('lists platform-only rows and ties timestamps by id', async () => {
    const now = new Date('2026-08-31T12:00:00.000Z');
    const repo = createMemoryAuditRepository(() => now);
    const a = await repo.insertEvent(
      seed({
        idempotencyKey: 'hq-a',
        tenantId: null,
        locationId: null,
        actorSurface: 'hq',
        action: 'admin_action',
        moneyOrStock: false,
      }),
    );
    const b = await repo.insertEvent(
      seed({
        idempotencyKey: 'hq-b',
        tenantId: null,
        locationId: null,
        actorSurface: 'hq',
        action: 'admin_action',
        moneyOrStock: false,
      }),
    );
    const laterId =
      a.record.auditEventId > b.record.auditEventId ? a.record.auditEventId : b.record.auditEventId;
    const page = await repo.listEvents({
      platformOnly: true,
      limit: 10,
      cursor: encodeCursor(laterId),
    });
    expect(page.items).toHaveLength(1);
    await repo.insertEvent(seed({ idempotencyKey: 'shop-1' }));
    const platform = await repo.listEvents({ platformOnly: true, limit: 10 });
    expect(platform.items.every((row) => row.tenantId === null)).toBe(true);
    const shop = await repo.listEvents({ tenantId: TENANT, locationId: LOCATION, limit: 10 });
    expect(shop.items).toHaveLength(1);
    expect(ACTOR_SURFACES).toContain('hq');
  });

  it('clones snapshots and dates', () => {
    const now = new Date();
    const row: AuditEventRecord = {
      auditEventId: crypto.randomUUID(),
      idempotencyKey: 'k',
      tenantId: TENANT,
      locationId: LOCATION,
      actorUserId: 'u',
      actorRole: 'Owner',
      actorSurface: 'pharmacy',
      action: 'bill_posted',
      targetType: 'Bill',
      targetId: 'INV-1',
      moneyOrStock: true,
      before: { qty: 1 },
      after: { qty: 0 },
      occurredAt: now,
      clientOccurredAt: now,
      requestId: 'r',
      createdAt: now,
    };
    const cloned = cloneAuditEvent(row);
    cloned.before!.qty = 9;
    expect(row.before?.qty).toBe(1);
    const empty = cloneAuditEvent({ ...row, before: null, after: null, clientOccurredAt: null });
    expect(empty.before).toBeNull();
  });
});

describe('sql audit repository', () => {
  function mockPool(query: ReturnType<typeof vi.fn>) {
    return { query };
  }

  it('inserts, finds, and dedupes through parameterized SQL', async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql.startsWith('insert')) {
        return { rows: [sqlRow] };
      }
      if (sql.includes('where idempotency_key')) {
        return { rows: [sqlRow] };
      }
      if (sql.includes('where audit_event_id')) {
        return { rows: [sqlRow] };
      }
      return { rows: [] };
    });
    const repo = createSqlAuditRepository(mockPool(query) as never);
    const created = await repo.insertEvent(
      seed({ idempotencyKey: undefined, before: undefined, after: undefined }),
    );
    expect(created.record.auditEventId).toBe(sqlRow.audit_event_id);
    const deduped = await repo.insertEvent(seed());
    expect(deduped.deduped).toBe(true);
    await expect(repo.findById(sqlRow.audit_event_id)).resolves.toMatchObject({
      action: 'bill_posted',
    });
  });

  it('maps unique violations and empty inserts', async () => {
    let finds = 0;
    const query = vi.fn(async (sql: string) => {
      if (sql.startsWith('insert')) {
        throw { code: '23505' };
      }
      if (sql.includes('where idempotency_key')) {
        finds += 1;
        return finds > 1 ? { rows: [sqlRow] } : { rows: [] };
      }
      return { rows: [] };
    });
    const repo = createSqlAuditRepository(mockPool(query) as never);
    await expect(repo.insertEvent(seed())).resolves.toMatchObject({ deduped: true });
    const empty = createSqlAuditRepository(mockPool(vi.fn(async () => ({ rows: [] }))) as never);
    await expect(empty.insertEvent(seed({ idempotencyKey: undefined }))).rejects.toThrow(
      'Audit event insert did not persist',
    );
  });

  it('rethrows unique violations without a stored row', async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql.startsWith('insert')) {
        throw { code: '23505' };
      }
      return { rows: [] };
    });
    const repo = createSqlAuditRepository(mockPool(query) as never);
    await expect(repo.insertEvent(seed())).rejects.toMatchObject({ code: '23505' });
  });

  it('lists with filters, cursor, and platform-only', async () => {
    const extra = { ...sqlRow, audit_event_id: crypto.randomUUID() };
    const query = vi.fn(async (sql: string) => {
      if (sql.includes('tenant_id is null')) {
        return { rows: [{ ...sqlRow, tenant_id: null, location_id: null }] };
      }
      return { rows: [sqlRow, extra] };
    });
    const repo = createSqlAuditRepository(mockPool(query) as never);
    const paged = await repo.listEvents({
      tenantId: TENANT,
      locationId: LOCATION,
      actorUserId: 'user-111',
      action: 'bill_posted',
      targetType: 'Bill',
      targetId: 'INV-24-00018',
      from: new Date('2026-01-01T00:00:00.000Z'),
      to: new Date('2026-12-31T00:00:00.000Z'),
      cursor: encodeCursor(sqlRow.audit_event_id),
      limit: 1,
    });
    expect(paged.items).toHaveLength(1);
    expect(paged.nextCursor).toBeTruthy();
    const platform = await repo.listEvents({ platformOnly: true, limit: 10 });
    expect(platform.items[0]?.tenantId).toBeNull();
    const full = await repo.listEvents({ limit: 10 });
    expect(full.nextCursor).toBeNull();
  });
});
