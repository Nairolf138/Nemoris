import type { CapsuleApiClient } from '../api-client.js';
import type { CollectionName, CapsuleCollections } from '../models/contracts.js';
import type { SessionManager } from '../session.js';
import type { CapsuleStore } from '../state.js';

const CRUD_COLLECTIONS: CollectionName[] = ['memories', 'beliefs', 'lessons', 'valueProfiles', 'legacyMessages'];

export class CapsuleCrudService {
  public constructor(
    private readonly api: CapsuleApiClient,
    private readonly sessionManager: SessionManager,
    private readonly store: CapsuleStore,
  ) {}

  private getAuth(): { token: string; ownerId: string } {
    const session = this.sessionManager.readSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    return {
      token: session.session.token,
      ownerId: session.user.id,
    };
  }

  public async loadAllCrudScreens(): Promise<void> {
    const { token, ownerId } = this.getAuth();

    const [memories, beliefs, lessons, valueProfiles, legacyMessages] = await Promise.all([
      this.api.listCollection('memories', token, ownerId),
      this.api.listCollection('beliefs', token, ownerId),
      this.api.listCollection('lessons', token, ownerId),
      this.api.listCollection('valueProfiles', token, ownerId),
      this.api.listCollection('legacyMessages', token, ownerId),
    ]);

    this.store.setState({
      data: { memories, beliefs, lessons, valueProfiles, legacyMessages },
      ui: { error: undefined },
    });
  }

  public async create<K extends CollectionName>(collection: K, payload: Partial<CapsuleCollections[K][number]>): Promise<CapsuleCollections[K][number]> {
    const { token, ownerId } = this.getAuth();
    const item = await this.api.createCollectionItem(collection, token, ownerId, payload);
    const currentItems = this.store.getState().data[collection] as CapsuleCollections[K];
    this.store.setState({
      data: {
        [collection]: [...currentItems, item],
      } as Partial<CapsuleCollections>,
    });
    return item;
  }

  public async update<K extends CollectionName>(collection: K, id: string, payload: Partial<CapsuleCollections[K][number]>): Promise<CapsuleCollections[K][number]> {
    const { token, ownerId } = this.getAuth();
    const item = await this.api.updateCollectionItem(collection, id, token, ownerId, payload);
    const updated = this.store
      .getState()
      .data[collection]
      .map((entry) => (entry.id === id ? item : entry)) as CapsuleCollections[K];
    this.store.setState({
      data: { [collection]: updated } as Partial<CapsuleCollections>,
    });
    return item;
  }

  public async delete<K extends CollectionName>(collection: K, id: string): Promise<void> {
    const { token, ownerId } = this.getAuth();
    await this.api.deleteCollectionItem(collection, id, token, ownerId);
    const remaining = this.store.getState().data[collection].filter((entry) => entry.id !== id);
    this.store.setState({
      data: { [collection]: remaining } as Partial<CapsuleCollections>,
    });
  }

  public async primeCrudDataIfEmpty(): Promise<void> {
    const state = this.store.getState();
    const hasLoaded = CRUD_COLLECTIONS.some((collection) => state.data[collection].length > 0);
    if (!hasLoaded) {
      await this.loadAllCrudScreens();
    }
  }
}
