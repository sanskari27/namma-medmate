import { describe, expect, it, vi } from 'vitest';
import { ErrorCode } from '@namma-medmate/constants';
import { encodeCursor } from '@namma-medmate/pagination-utils';
import { createMemoryWhatsAppRepository, createSqlWhatsAppRepository } from '../../src/index.ts';
import { cloneWhatsAppMessage } from '../../src/whatsapp/clone.ts';
import type {
  InsertWhatsAppMessageInput,
  WhatsAppMessageRecord,
} from '../../src/whatsapp/types.ts';

const TENANT = '8f1c0a7e-2b3d-4e5f-8a90-123456789abc';
const LOCATION = '1a2b3c4d-5e6f-7081-92a3-b4c5d6e7f809';

function seed(overrides: Partial<InsertWhatsAppMessageInput> = {}): InsertWhatsAppMessageInput {
  return {
    tenantId: TENANT,
    locationId: LOCATION,
    templateKey: 'khata_remind',
    to: '+919876543210',
    purpose: 'khata_remind',
    billId: null,
    campaignId: null,
    idempotencyKey: 'key-1',
    mandatory: false,
    paramsRedacted: { shop_name: 'Sri Krishna Medicals' },
    ...overrides,
  };
}

const sqlRow = {
  message_id: '3c9f1a22-1111-4b22-8333-444455556666',
  tenant_id: TENANT,
  location_id: LOCATION,
  template_key: 'khata_remind',
  to_e164: '+919876543210',
  purpose: 'khata_remind',
  status: 'queued',
  bill_id: null,
  campaign_id: null,
  idempotency_key: 'key-1',
  mandatory: false,
  acknowledged_at: null,
  acknowledged_by_user_id: null,
  retry_count: 0,
  meta_message_id: null,
  last_error_code: null,
  params_redacted: { shop_name: 'Sri Krishna Medicals' },
  lease_expires_at: null,
  created_at: new Date('2026-08-31T10:00:00.000Z'),
  updated_at: new Date('2026-08-31T10:00:00.000Z'),
  last_attempt_at: null,
};

describe('memory whatsapp repository', () => {
  it('inserts, finds, dedupes, and pages newest first', async () => {
    const repo = createMemoryWhatsAppRepository();
    const first = await repo.insertQueued(seed({ idempotencyKey: 'a', billId: 'INV-1' }));
    const second = await repo.insertQueued(
      seed({ idempotencyKey: 'b', templateKey: 'login_otp', purpose: 'otp' }),
    );
    expect(first.status).toBe('queued');
    await expect(repo.findById(first.messageId)).resolves.toMatchObject({
      messageId: first.messageId,
    });
    await expect(repo.findById(crypto.randomUUID())).resolves.toBeUndefined();
    await expect(
      repo.findDuplicate({
        templateKey: 'khata_remind',
        to: '+919876543210',
        billId: 'INV-1',
        idempotencyKey: 'other',
      }),
    ).resolves.toMatchObject({ messageId: first.messageId });
    await expect(
      repo.findDuplicate({
        templateKey: 'login_otp',
        to: '+919876543210',
        billId: null,
        idempotencyKey: 'b',
      }),
    ).resolves.toMatchObject({ messageId: second.messageId });
    await expect(
      repo.findDuplicate({
        templateKey: 'refill',
        to: '+919876543210',
        billId: null,
        idempotencyKey: 'missing',
      }),
    ).resolves.toBeUndefined();
    const page = await repo.listInbox({ tenantId: TENANT, locationId: LOCATION, limit: 1 });
    expect(page.items).toHaveLength(1);
    expect(page.nextCursor).toBeTruthy();
    const next = await repo.listInbox({
      tenantId: TENANT,
      locationId: LOCATION,
      limit: 1,
      cursor: page.nextCursor ?? undefined,
    });
    expect(next.items).toHaveLength(1);
    const filtered = await repo.listInbox({
      tenantId: TENANT,
      locationId: LOCATION,
      status: 'queued',
      templateKey: 'login_otp',
      limit: 10,
    });
    expect(filtered.items).toHaveLength(1);
    const ignored = await repo.listInbox({
      tenantId: TENANT,
      locationId: LOCATION,
      cursor: 'not-valid',
      limit: 10,
    });
    expect(ignored.items.length).toBe(2);
    let tick = 0;
    const clocked = createMemoryWhatsAppRepository(
      () => new Date(Date.parse('2026-08-31T12:00:00.000Z') + tick++ * 1000),
    );
    await clocked.insertQueued(seed({ idempotencyKey: 'older' }));
    const newer = await clocked.insertQueued(seed({ idempotencyKey: 'newer' }));
    const olderPage = await clocked.listInbox({
      tenantId: TENANT,
      locationId: LOCATION,
      limit: 10,
      cursor: encodeCursor(newer.messageId),
    });
    expect(olderPage.items).toHaveLength(1);
    const stamped = new Date('2026-08-31T12:00:00.000Z');
    const sameTime = createMemoryWhatsAppRepository(() => stamped);
    const alpha = await sameTime.insertQueued(seed({ idempotencyKey: 'alpha' }));
    const beta = await sameTime.insertQueued(seed({ idempotencyKey: 'beta' }));
    const laterId = alpha.messageId > beta.messageId ? alpha.messageId : beta.messageId;
    const samePage = await sameTime.listInbox({
      tenantId: TENANT,
      locationId: LOCATION,
      limit: 10,
      cursor: encodeCursor(laterId),
    });
    expect(samePage.items).toHaveLength(1);
  });

  it('leases, marks attempts, updates status, and acknowledges mandatory failures', async () => {
    const repo = createMemoryWhatsAppRepository();
    const created = await repo.insertQueued(
      seed({ templateKey: 'irn_fail', purpose: 'irn_fail', mandatory: true, billId: 'INV-19' }),
    );
    const leased = await repo.acquireLease(created.messageId, new Date(Date.now() + 5_000));
    expect(leased?.messageId).toBe(created.messageId);
    await expect(
      repo.acquireLease(created.messageId, new Date(Date.now() + 5_000)),
    ).resolves.toBeUndefined();
    await expect(repo.acquireLease(crypto.randomUUID(), new Date())).resolves.toBeUndefined();
    const sent = await repo.markAttempt({
      messageId: created.messageId,
      status: 'sent',
      retryCount: 1,
      metaMessageId: 'wamid.1',
    });
    expect(sent.metaMessageId).toBe('wamid.1');
    await expect(repo.findByMetaMessageId('wamid.1')).resolves.toMatchObject({
      messageId: created.messageId,
    });
    await expect(repo.findByMetaMessageId('missing')).resolves.toBeUndefined();
    const failed = await repo.markAttempt({
      messageId: created.messageId,
      status: 'failed',
      retryCount: 3,
      lastErrorCode: 'META_UNAVAILABLE',
    });
    expect(failed.status).toBe('failed');
    const listed = await repo.listMandatoryFailures({ tenantId: TENANT, locationId: LOCATION });
    expect(listed).toHaveLength(1);
    const acked = await repo.acknowledge({
      messageId: created.messageId,
      actorUserId: 'owner-1',
      at: new Date(),
    });
    expect(acked.acknowledgedByUserId).toBe('owner-1');
    await expect(
      repo.listMandatoryFailures({ tenantId: TENANT, locationId: LOCATION }),
    ).resolves.toHaveLength(0);
    const delivered = await repo.updateStatus({
      messageId: created.messageId,
      status: 'delivered',
      lastErrorCode: null,
    });
    expect(delivered?.status).toBe('delivered');
    expect(delivered?.lastErrorCode).toBeNull();
    await expect(
      repo.updateStatus({ messageId: created.messageId, status: 'read' }),
    ).resolves.toMatchObject({ status: 'read' });
    await expect(
      repo.updateStatus({ messageId: crypto.randomUUID(), status: 'read' }),
    ).resolves.toBeUndefined();
    await expect(
      repo.markAttempt({ messageId: crypto.randomUUID(), status: 'failed', retryCount: 1 }),
    ).rejects.toMatchObject({ code: ErrorCode.NOT_FOUND });
    await expect(
      repo.acknowledge({
        messageId: crypto.randomUUID(),
        actorUserId: 'x',
        at: new Date(),
      }),
    ).rejects.toMatchObject({ code: ErrorCode.NOT_FOUND });
  });

  it('clones dates and params', () => {
    const now = new Date();
    const row: WhatsAppMessageRecord = {
      messageId: crypto.randomUUID(),
      tenantId: TENANT,
      locationId: LOCATION,
      templateKey: 'refill',
      to: '+919876543210',
      purpose: 'refill',
      status: 'queued',
      billId: null,
      campaignId: null,
      idempotencyKey: 'k',
      mandatory: false,
      acknowledgedAt: now,
      acknowledgedByUserId: 'u',
      retryCount: 0,
      metaMessageId: null,
      lastErrorCode: null,
      paramsRedacted: { shop_name: 'A' },
      leaseExpiresAt: now,
      createdAt: now,
      updatedAt: now,
      lastAttemptAt: now,
    };
    const cloned = cloneWhatsAppMessage(row);
    cloned.paramsRedacted.shop_name = 'B';
    expect(row.paramsRedacted.shop_name).toBe('A');
  });
});

describe('sql whatsapp repository', () => {
  function mockPool(query: ReturnType<typeof vi.fn>) {
    return { query };
  }

  it('inserts and maps rows through parameterized SQL', async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql.startsWith('insert')) {
        return { rows: [sqlRow] };
      }
      if (sql.includes('where message_id = $1') && !sql.startsWith('update')) {
        return { rows: [sqlRow] };
      }
      if (sql.includes('and bill_id = $3')) {
        return { rows: [sqlRow] };
      }
      if (sql.includes('and idempotency_key = $3')) {
        return { rows: [] };
      }
      if (sql.includes('where meta_message_id')) {
        return { rows: [{ ...sqlRow, meta_message_id: 'wamid.1' }] };
      }
      return { rows: [] };
    });
    const repo = createSqlWhatsAppRepository(mockPool(query) as never);
    const created = await repo.insertQueued(seed());
    expect(created.messageId).toBe(sqlRow.message_id);
    await expect(repo.findById(sqlRow.message_id)).resolves.toMatchObject({
      to: '+919876543210',
    });
    await expect(
      repo.findDuplicate({
        templateKey: 'khata_remind',
        to: '+919876543210',
        billId: 'INV-1',
        idempotencyKey: 'x',
      }),
    ).resolves.toBeDefined();
    await expect(
      repo.findDuplicate({
        templateKey: 'login_otp',
        to: '+919876543210',
        billId: null,
        idempotencyKey: 'x',
      }),
    ).resolves.toBeUndefined();
    await expect(repo.findByMetaMessageId('wamid.1')).resolves.toMatchObject({
      metaMessageId: 'wamid.1',
    });
  });

  it('fails when insert does not return a row', async () => {
    const repo = createSqlWhatsAppRepository(mockPool(vi.fn(async () => ({ rows: [] }))) as never);
    await expect(repo.insertQueued(seed())).rejects.toThrow(
      'WhatsApp message insert did not persist',
    );
  });

  it('lists inbox with filters, cursor, and mandatory failures', async () => {
    const extra = { ...sqlRow, message_id: crypto.randomUUID() };
    const query = vi.fn(async (sql: string) => {
      if (sql.includes('acknowledged_at is null')) {
        return { rows: [sqlRow] };
      }
      if (sql.includes('order by created_at desc')) {
        return { rows: [sqlRow, extra] };
      }
      return { rows: [sqlRow] };
    });
    const repo = createSqlWhatsAppRepository(mockPool(query) as never);
    const paged = await repo.listInbox({
      tenantId: TENANT,
      locationId: LOCATION,
      status: 'queued',
      templateKey: 'khata_remind',
      cursor: encodeCursor(sqlRow.message_id),
      limit: 1,
    });
    expect(paged.items).toHaveLength(1);
    expect(paged.nextCursor).toBeTruthy();
    const full = await repo.listInbox({ tenantId: TENANT, locationId: LOCATION, limit: 10 });
    expect(full.nextCursor).toBeNull();
    await expect(
      repo.listMandatoryFailures({ tenantId: TENANT, locationId: LOCATION }),
    ).resolves.toHaveLength(1);
  });

  it('leases, marks, updates, and acknowledges through SQL', async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql.startsWith('update') && sql.includes('lease_expires_at = $2')) {
        return { rows: [sqlRow] };
      }
      if (sql.startsWith('update') && sql.includes('set status = $2, retry_count = $3')) {
        return {
          rows: [{ ...sqlRow, status: 'sent', retry_count: 1, meta_message_id: 'wamid.1' }],
        };
      }
      if (sql.startsWith('update') && sql.includes('set acknowledged_at')) {
        return { rows: [{ ...sqlRow, acknowledged_by_user_id: 'owner-1' }] };
      }
      if (sql.startsWith('update')) {
        return { rows: [{ ...sqlRow, status: 'delivered' }] };
      }
      return { rows: [] };
    });
    const repo = createSqlWhatsAppRepository(mockPool(query) as never);
    await expect(repo.acquireLease(sqlRow.message_id, new Date())).resolves.toBeDefined();
    await expect(
      repo.markAttempt({
        messageId: sqlRow.message_id,
        status: 'sent',
        retryCount: 1,
        metaMessageId: 'wamid.1',
      }),
    ).resolves.toMatchObject({ status: 'sent' });
    await expect(
      repo.updateStatus({ messageId: sqlRow.message_id, status: 'delivered' }),
    ).resolves.toMatchObject({ status: 'delivered' });
    await expect(
      repo.acknowledge({
        messageId: sqlRow.message_id,
        actorUserId: 'owner-1',
        at: new Date(),
      }),
    ).resolves.toMatchObject({ acknowledgedByUserId: 'owner-1' });
  });

  it('maps missing update rows to not found', async () => {
    const empty = createSqlWhatsAppRepository(mockPool(vi.fn(async () => ({ rows: [] }))) as never);
    await expect(
      empty.markAttempt({ messageId: sqlRow.message_id, status: 'failed', retryCount: 1 }),
    ).rejects.toMatchObject({ code: ErrorCode.NOT_FOUND });
    await expect(
      empty.acknowledge({
        messageId: sqlRow.message_id,
        actorUserId: 'x',
        at: new Date(),
      }),
    ).rejects.toMatchObject({ code: ErrorCode.NOT_FOUND });
    await expect(
      empty.updateStatus({ messageId: sqlRow.message_id, status: 'read' }),
    ).resolves.toBeUndefined();
    await expect(empty.acquireLease(sqlRow.message_id, new Date())).resolves.toBeUndefined();
  });
});
