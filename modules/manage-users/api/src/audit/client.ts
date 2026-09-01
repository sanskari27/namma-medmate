export interface ManageUsersAuditEvent {
  action: string;
  tenantId: string;
  locationId: string;
  actorUserId: string;
  actorRole: string;
  targetId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  idempotencyKey: string;
}

export interface ManageUsersAuditClient {
  ingest(event: ManageUsersAuditEvent): Promise<void>;
}

export class MemoryAuditClient implements ManageUsersAuditClient {
  readonly events: ManageUsersAuditEvent[] = [];
  fail = false;

  async ingest(event: ManageUsersAuditEvent): Promise<void> {
    if (this.fail) {
      throw new Error('audit unavailable');
    }
    this.events.push(event);
  }
}
