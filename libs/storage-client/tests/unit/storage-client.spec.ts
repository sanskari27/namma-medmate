import { describe, expect, it } from 'vitest';
import { MemoryStorageClient } from '../../src/index.ts';

describe('MemoryStorageClient', () => {
  it('stores and retrieves objects', async () => {
    const client = new MemoryStorageClient();
    await client.put({ bucket: 'web', key: 'index.html', body: '<html></html>' });
    expect(await client.get('web', 'index.html')).toMatchObject({ key: 'index.html' });
    expect(await client.get('web', 'missing')).toBeUndefined();
  });
});
