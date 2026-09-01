import { describe, expect, it } from 'vitest';
import { MemoryStorageClient } from '../../src/index.ts';

describe('MemoryStorageClient', () => {
  it('stores and retrieves objects', async () => {
    const client = new MemoryStorageClient();
    await client.put({ bucket: 'web', key: 'index.html', body: '<html></html>' });
    expect(await client.get('web', 'index.html')).toMatchObject({ key: 'index.html' });
    expect(await client.get('web', 'missing')).toBeUndefined();
  });

  it('issues tenant-scoped presigned keys and signed GET urls', async () => {
    const client = new MemoryStorageClient();
    const issued = await client.presignPut({
      bucket: 'hr',
      key: 'tenants/t1/employees/e1/photo',
      contentType: 'image/jpeg',
      expiresInSeconds: 600,
      tenantId: 't1',
    });
    expect(issued.uploadUrl).toContain('tenants/t1/employees/e1/photo');
    expect(issued.expiresInSeconds).toBe(600);
    expect(client.isIssuedKey('t1', issued.objectKey)).toBe(true);
    expect(client.isIssuedKey('t2', issued.objectKey)).toBe(false);
    expect(client.signedGetUrl('hr', issued.objectKey, 600)).toBeUndefined();
    await client.put({
      bucket: 'hr',
      key: issued.objectKey,
      body: 'photo',
      contentType: 'image/jpeg',
    });
    expect(client.signedGetUrl('hr', issued.objectKey, 600)).toContain('exp=600');
    await client.delete('hr', issued.objectKey);
    expect(await client.get('hr', issued.objectKey)).toBeUndefined();
  });
});
