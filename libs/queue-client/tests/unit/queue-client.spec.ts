import { describe, expect, it } from 'vitest';
import { MemoryQueueClient } from '../../src/index.ts';

describe('MemoryQueueClient', () => {
  it('sends and receives in FIFO order', async () => {
    const client = new MemoryQueueClient();
    await client.send({ queue: 'jobs', body: 'a' });
    expect(await client.receive('jobs')).toEqual({ queue: 'jobs', body: 'a' });
    expect(await client.receive('jobs')).toBeUndefined();
    expect(await client.receive('empty')).toBeUndefined();
  });
});
