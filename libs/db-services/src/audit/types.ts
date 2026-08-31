export const ACTOR_SURFACES = ['pharmacy', 'hq', 'kiosk', 'system'] as const;
export type ActorSurface = (typeof ACTOR_SURFACES)[number];

export interface AuditEventRecord {
  auditEventId: string;
  idempotencyKey: string | null;
  tenantId: string | null;
  locationId: string | null;
  actorUserId: string;
  actorRole: string;
  actorSurface: ActorSurface;
  action: string;
  targetType: string;
  targetId: string;
  moneyOrStock: boolean;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  occurredAt: Date;
  clientOccurredAt: Date | null;
  requestId: string | null;
  createdAt: Date;
}

export interface InsertAuditEventInput {
  idempotencyKey?: string | null;
  tenantId: string | null;
  locationId: string | null;
  actorUserId: string;
  actorRole: string;
  actorSurface: ActorSurface;
  action: string;
  targetType: string;
  targetId: string;
  moneyOrStock: boolean;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  clientOccurredAt?: Date | null;
  requestId?: string | null;
}

export interface InsertAuditEventResult {
  record: AuditEventRecord;
  deduped: boolean;
}

export interface ListAuditEventsInput {
  tenantId?: string | null;
  locationId?: string | null;
  platformOnly?: boolean;
  actorUserId?: string;
  action?: string;
  targetType?: string;
  targetId?: string;
  from?: Date;
  to?: Date;
  limit: number;
  cursor?: string;
}

export interface ListAuditEventsResult {
  items: AuditEventRecord[];
  nextCursor: string | null;
}

export interface AuditRepository {
  insertEvent(input: InsertAuditEventInput): Promise<InsertAuditEventResult>;
  findById(auditEventId: string): Promise<AuditEventRecord | undefined>;
  findByIdempotencyKey(idempotencyKey: string): Promise<AuditEventRecord | undefined>;
  listEvents(input: ListAuditEventsInput): Promise<ListAuditEventsResult>;
}
