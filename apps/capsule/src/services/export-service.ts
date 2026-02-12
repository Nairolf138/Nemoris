import type { CapsuleApiClient } from '../api-client.js';
import type { ExportFormat, ExportJob } from '../models/contracts.js';
import type { SessionManager } from '../session.js';
import type { CapsuleStore } from '../state.js';

export class CapsuleExportService {
  public constructor(
    private readonly api: CapsuleApiClient,
    private readonly sessionManager: SessionManager,
    private readonly store: CapsuleStore,
  ) {}

  private getAuth(): { token: string; ownerId: string } {
    const session = this.sessionManager.readSession();
    if (!session) throw new Error('Not authenticated');
    return { token: session.session.token, ownerId: session.user.id };
  }

  public async createExport(format: ExportFormat): Promise<ExportJob> {
    const { token, ownerId } = this.getAuth();
    const created = await this.api.createExport(token, ownerId, format);
    this.store.setState({ exports: [...this.store.getState().exports, created] });
    return created;
  }

  public async refreshExportStatus(exportId: string): Promise<ExportJob> {
    const { token, ownerId } = this.getAuth();
    const updated = await this.api.getExportStatus(token, ownerId, exportId);
    this.store.setState({
      exports: this.store.getState().exports.map((entry) => (entry.id === exportId ? updated : entry)),
    });
    return updated;
  }

  public getDownloadUrl(exportId: string): string {
    return this.api.getExportDownloadUrl(exportId);
  }
}
