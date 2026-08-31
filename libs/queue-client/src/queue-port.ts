export interface QueueMessage {
  queue: string;
  body: string;
}

export interface QueueClient {
  send(message: QueueMessage): Promise<void>;
  receive(queue: string): Promise<QueueMessage | undefined>;
}

export class MemoryQueueClient implements QueueClient {
  private readonly queues = new Map<string, QueueMessage[]>();

  async send(message: QueueMessage): Promise<void> {
    const existing = this.queues.get(message.queue) ?? [];
    existing.push(message);
    this.queues.set(message.queue, existing);
  }

  async receive(queue: string): Promise<QueueMessage | undefined> {
    const existing = this.queues.get(queue) ?? [];
    return existing.shift();
  }
}
