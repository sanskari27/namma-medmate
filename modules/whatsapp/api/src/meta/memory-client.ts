import type { MetaClient, MetaSendInput, MetaSendResult } from './client.ts';

export class MemoryMetaClient implements MetaClient {
  readonly sent: MetaSendInput[] = [];
  private readonly results: MetaSendResult[] = [];

  queueResult(result: MetaSendResult): void {
    this.results.push(result);
  }

  async sendTemplate(input: MetaSendInput): Promise<MetaSendResult> {
    this.sent.push(input);
    return (
      this.results.shift() ?? {
        ok: true,
        retryable: false,
        metaMessageId: `wamid.${this.sent.length}`,
      }
    );
  }
}
