export interface StoredObject {
  bucket: string;
  key: string;
  body: string;
}

export interface StorageClient {
  put(object: StoredObject): Promise<void>;
  get(bucket: string, key: string): Promise<StoredObject | undefined>;
}

export class MemoryStorageClient implements StorageClient {
  private readonly objects = new Map<string, StoredObject>();

  async put(object: StoredObject): Promise<void> {
    this.objects.set(`${object.bucket}/${object.key}`, object);
  }

  async get(bucket: string, key: string): Promise<StoredObject | undefined> {
    return this.objects.get(`${bucket}/${key}`);
  }
}
