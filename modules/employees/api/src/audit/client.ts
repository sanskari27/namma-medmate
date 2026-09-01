export interface EmployeesAuditEvent {
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

export interface EmployeesAuditClient {
  ingest(event: EmployeesAuditEvent): Promise<void>;
}

export class MemoryAuditClient implements EmployeesAuditClient {
  readonly events: EmployeesAuditEvent[] = [];
  fail = false;

  async ingest(event: EmployeesAuditEvent): Promise<void> {
    if (this.fail) {
      throw new Error('audit unavailable');
    }
    this.events.push(event);
  }
}
