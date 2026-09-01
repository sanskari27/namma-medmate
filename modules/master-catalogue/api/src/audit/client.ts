export interface AdminActionInput {
  actorUserId: string;
  actorRole: string;
  targetId: string;
  after: Record<string, unknown>;
  idempotencyKey: string;
}

export interface AuditIngestClient {
  ingestAdminAction(input: AdminActionInput): Promise<void>;
}

export class MemoryAuditClient implements AuditIngestClient {
  readonly events: AdminActionInput[] = [];
  fail = false;

  async ingestAdminAction(input: AdminActionInput): Promise<void> {
    if (this.fail) {
      throw new Error('audit unavailable');
    }
    this.events.push(input);
  }
}
