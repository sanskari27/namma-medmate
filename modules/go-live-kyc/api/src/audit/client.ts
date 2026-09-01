export interface GoLiveKycAuditEvent {
  action: string;
  tenantId: string;
  locationId: string;
  actorUserId: string;
  actorRole: string;
  actorSurface: 'pharmacy' | 'hq';
  targetId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  idempotencyKey: string;
}

export interface GoLiveKycAuditClient {
  ingest(event: GoLiveKycAuditEvent): Promise<void>;
}

export class MemoryAuditClient implements GoLiveKycAuditClient {
  readonly events: GoLiveKycAuditEvent[] = [];
  fail = false;

  async ingest(event: GoLiveKycAuditEvent): Promise<void> {
    if (this.fail) {
      throw new Error('audit unavailable');
    }
    this.events.push(event);
  }
}
