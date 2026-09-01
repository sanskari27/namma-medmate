export interface StoredObject {
  bucket: string;
  key: string;
  body: string;
  contentType?: string;
}

export interface PresignPutInput {
  bucket: string;
  key: string;
  contentType: string;
  expiresInSeconds: number;
  tenantId: string;
}

export interface PresignPutResult {
  uploadUrl: string;
  objectKey: string;
  expiresInSeconds: number;
}

export interface StorageClient {
  put(object: StoredObject): Promise<void>;
  get(bucket: string, key: string): Promise<StoredObject | undefined>;
  delete(bucket: string, key: string): Promise<void>;
  presignPut(input: PresignPutInput): Promise<PresignPutResult>;
  isIssuedKey(tenantId: string, objectKey: string): boolean;
  signedGetUrl(bucket: string, key: string, expiresInSeconds: number): string | undefined;
}

export class MemoryStorageClient implements StorageClient {
  private readonly objects = new Map<string, StoredObject>();
  private readonly issued = new Map<string, string>();

  async put(object: StoredObject): Promise<void> {
    this.objects.set(`${object.bucket}/${object.key}`, object);
  }

  async get(bucket: string, key: string): Promise<StoredObject | undefined> {
    return this.objects.get(`${bucket}/${key}`);
  }

  async delete(bucket: string, key: string): Promise<void> {
    this.objects.delete(`${bucket}/${key}`);
  }

  async presignPut(input: PresignPutInput): Promise<PresignPutResult> {
    this.issued.set(input.key, input.tenantId);
    return {
      uploadUrl: `memory://upload/${input.bucket}/${input.key}`,
      objectKey: input.key,
      expiresInSeconds: input.expiresInSeconds,
    };
  }

  isIssuedKey(tenantId: string, objectKey: string): boolean {
    return this.issued.get(objectKey) === tenantId;
  }

  signedGetUrl(bucket: string, key: string, expiresInSeconds: number): string | undefined {
    if (!this.objects.has(`${bucket}/${key}`)) {
      return undefined;
    }
    return `memory://get/${bucket}/${key}?exp=${expiresInSeconds}`;
  }
}
