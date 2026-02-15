export interface StoredObject {
  bucket: string;
  key: string;
  contentType: string;
  contentLength: number;
  bodyBase64: string;
  etag: string;
  createdAt: string;
}

export interface PutObjectInput {
  bucket: string;
  key: string;
  contentType: string;
  bodyBase64: string;
  etag: string;
}

export interface ObjectStorageAdapter {
  putObject(input: PutObjectInput): Promise<StoredObject>;
  getObject(bucket: string, key: string): Promise<StoredObject | null>;
  listObjects(bucket: string, prefix: string): Promise<StoredObject[]>;
}

export class InMemoryObjectStorageAdapter implements ObjectStorageAdapter {
  private readonly objects = new Map<string, StoredObject>();
  private calculateBase64Bytes(base64: string): number {
    const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
    return (base64.length * 3) / 4 - padding;
  }

  public async putObject(input: PutObjectInput): Promise<StoredObject> {
    const now = new Date().toISOString();
    const normalizedKey = `${input.bucket}/${input.key}`;
    const object: StoredObject = {
      bucket: input.bucket,
      key: input.key,
      contentType: input.contentType,
      contentLength: this.calculateBase64Bytes(input.bodyBase64),
      bodyBase64: input.bodyBase64,
      etag: input.etag,
      createdAt: now,
    };
    this.objects.set(normalizedKey, object);
    return object;
  }

  public async getObject(bucket: string, key: string): Promise<StoredObject | null> {
    return this.objects.get(`${bucket}/${key}`) ?? null;
  }

  public async listObjects(bucket: string, prefix: string): Promise<StoredObject[]> {
    const normalizedPrefix = `${bucket}/${prefix}`;
    return [...this.objects.entries()]
      .filter(([key]) => key.startsWith(normalizedPrefix))
      .map(([, value]) => value)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }
}
