export type RetryWorker = (messageId: string) => Promise<void>;

export interface RetryScheduler {
  schedule(messageId: string, delayMs: number): void | Promise<void>;
  bind(worker: RetryWorker): void;
}

export class ImmediateRetryScheduler implements RetryScheduler {
  private worker: RetryWorker | undefined;
  readonly delays: number[] = [];

  bind(worker: RetryWorker): void {
    this.worker = worker;
  }

  async schedule(messageId: string, delayMs: number): Promise<void> {
    this.delays.push(delayMs);
    await this.worker?.(messageId);
  }
}

export const RETRY_BACKOFF_MS = [2_000, 10_000, 60_000] as const;
