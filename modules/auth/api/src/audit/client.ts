export interface AuthAuditEvent {
  action: string;
  tenantId: string;
  locationId: string;
  actorUserId: string;
  actorRole: string;
  targetId: string;
  after: Record<string, unknown>;
  idempotencyKey: string;
}

export interface AuthAuditClient {
  ingest(event: AuthAuditEvent): Promise<void>;
}

export class MemoryAuditClient implements AuthAuditClient {
  readonly events: AuthAuditEvent[] = [];
  fail = false;

  async ingest(event: AuthAuditEvent): Promise<void> {
    if (this.fail) {
      throw new Error('audit unavailable');
    }
    this.events.push(event);
  }
}
