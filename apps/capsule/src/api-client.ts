import { API_ERROR_CODES, CapsuleApiError, toApiError } from './errors.js';
import type {
  AuthSessionResponse,
  CollectionName,
  CapsuleCollections,
  ExportFormat,
  ExportJob,
  RefreshResponse,
  RecoveryCompletionResponse,
} from './models/contracts.js';


const collectionPath: Record<CollectionName, string> = {
  memories: 'memories',
  beliefs: 'beliefs',
  lessons: 'lessons',
  valueProfiles: 'value-profiles',
  legacyMessages: 'legacy-messages',
  beneficiaries: 'beneficiaries',
  narrativeNodes: 'narrative-nodes',
  narrativeEdges: 'narrative-edges',
  externalAttachments: 'external-attachments',
};

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string;
  ownerId?: string;
}

export class CapsuleApiClient {
  public constructor(private readonly baseUrl: string) {}

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (options.token) headers.authorization = `Bearer ${options.token}`;
    if (options.ownerId) headers['x-owner-id'] = options.ownerId;

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (response.status === 204) {
      return undefined as T;
    }

    const payload = (await response.json().catch(() => undefined)) as unknown;

    if (!response.ok) {
      throw toApiError(response.status, payload);
    }

    return payload as T;
  }

  public register(email: string, password: string): Promise<AuthSessionResponse> {
    return this.request('/auth/register', { method: 'POST', body: { email, password } });
  }

  public login(email: string, password: string): Promise<AuthSessionResponse> {
    return this.request('/auth/login', { method: 'POST', body: { email, password } });
  }


  public completeRecovery(email: string, password: string, proofs: string[]): Promise<RecoveryCompletionResponse> {
    return this.request('/auth/recovery/complete', { method: 'POST', body: { email, password, proofs } });
  }

  public logout(token: string): Promise<void> {
    return this.request('/auth/logout', { method: 'POST', token });
  }

  public refresh(token: string): Promise<RefreshResponse> {
    return this.request('/auth/refresh', { method: 'POST', token });
  }

  public listCollection<K extends CollectionName>(collection: K, token: string, ownerId: string): Promise<CapsuleCollections[K]> {
    return this.request(`/${collectionPath[collection]}`, { token, ownerId });
  }

  public createCollectionItem<K extends CollectionName>(collection: K, token: string, ownerId: string, input: Partial<CapsuleCollections[K][number]>): Promise<CapsuleCollections[K][number]> {
    return this.request(`/${collectionPath[collection]}`, { method: 'POST', token, ownerId, body: input });
  }

  public updateCollectionItem<K extends CollectionName>(collection: K, id: string, token: string, ownerId: string, input: Partial<CapsuleCollections[K][number]>): Promise<CapsuleCollections[K][number]> {
    return this.request(`/${collectionPath[collection]}/${id}`, { method: 'PATCH', token, ownerId, body: input });
  }

  public deleteCollectionItem<K extends CollectionName>(collection: K, id: string, token: string, ownerId: string): Promise<void> {
    return this.request(`/${collectionPath[collection]}/${id}`, { method: 'DELETE', token, ownerId });
  }

  public async createExport(token: string, ownerId: string, format: ExportFormat): Promise<ExportJob> {
    if (!['json', 'pdf'].includes(format)) {
      throw new CapsuleApiError(400, { error: API_ERROR_CODES.INVALID_EXPORT_FORMAT });
    }

    return this.request('/exports', {
      method: 'POST',
      token,
      ownerId,
      body: { format },
    });
  }

  public getExportStatus(token: string, ownerId: string, exportId: string): Promise<ExportJob> {
    return this.request(`/exports/${exportId}`, { token, ownerId });
  }

  public getExportDownloadUrl(exportId: string): string {
    return `${this.baseUrl}/exports/${exportId}/download`;
  }
}
