import { describe, expect, it } from 'vitest';
import { MemoryNotificationClient } from '../../src/index.ts';

describe('MemoryNotificationClient', () => {
  it('records sent notifications', async () => {
    const client = new MemoryNotificationClient();
    await client.send({ channel: 'email', to: 'a@b.co', body: 'hello' });
    expect(client.sent).toHaveLength(1);
  });
});
