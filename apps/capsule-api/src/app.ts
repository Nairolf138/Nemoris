import type { ResponseLike, RequestLike } from './types.js';
import { AuthService } from './auth-service.js';
import { ExportService, type ExportFormat } from './export-service.js';

interface Credentials {
  email: string;
  password: string;
}

const parseBearer = (authorization?: string): string | undefined => {
  if (!authorization) {
    return undefined;
  }
  const [scheme, token] = authorization.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return undefined;
  }
  return token;
};

const parseCredentials = (body: unknown): Credentials => {
  const payload = body as Partial<Credentials>;
  if (!payload?.email || !payload?.password) {
    throw new Error('INVALID_PAYLOAD');
  }
  return { email: payload.email, password: payload.password };
};

const parseExportFormat = (body: unknown): ExportFormat => {
  const payload = body as { format?: ExportFormat } | undefined;
  if (!payload?.format) {
    return 'json';
  }
  if (payload.format !== 'json' && payload.format !== 'pdf') {
    throw new Error('INVALID_PAYLOAD');
  }
  return payload.format;
};

export class CapsuleApiApp {
  private authService = new AuthService();
  private exportService = new ExportService();

  public async handle(request: RequestLike): Promise<ResponseLike> {
    try {
      if (request.method === 'POST' && request.path === '/auth/register') {
        const creds = parseCredentials(request.body);
        return { status: 201, body: await this.authService.register(creds.email, creds.password) };
      }

      if (request.method === 'POST' && request.path === '/auth/login') {
        const creds = parseCredentials(request.body);
        return { status: 200, body: await this.authService.login(creds.email, creds.password) };
      }

      if (request.method === 'POST' && request.path === '/auth/logout') {
        const token = parseBearer(request.headers?.authorization);
        if (!token) {
          return { status: 401, body: { error: 'UNAUTHENTICATED' } };
        }
        this.authService.logout(token);
        return { status: 204, body: null };
      }

      if (request.method === 'POST' && request.path === '/auth/refresh') {
        const token = parseBearer(request.headers?.authorization);
        if (!token) {
          return { status: 401, body: { error: 'UNAUTHENTICATED' } };
        }
        return { status: 200, body: { session: this.authService.refresh(token) } };
      }

      if (request.method === 'POST' && request.path === '/exports') {
        return this.generateExport(request);
      }

      if (request.method === 'GET' && request.path.startsWith('/exports/') && request.path.endsWith('/download')) {
        return this.downloadExport(request);
      }

      if (request.method === 'GET' && request.path === '/exports/audit') {
        return this.listExportAuditLogs(request);
      }

      if (request.path.startsWith('/data/')) {
        return this.protectDataRoute(request);
      }

      return { status: 404, body: { error: 'NOT_FOUND' } };
    } catch (error) {
      return this.mapError(error);
    }
  }

  private protectDataRoute(request: RequestLike): ResponseLike {
    const token = parseBearer(request.headers?.authorization);
    if (!token) {
      return { status: 401, body: { error: 'UNAUTHENTICATED' } };
    }

    this.authService.authenticate(token);
    return {
      status: 200,
      body: {
        message: `Accès autorisé à ${request.path}`,
      },
    };
  }

  private async generateExport(request: RequestLike): Promise<ResponseLike> {
    const token = parseBearer(request.headers?.authorization);
    if (!token) {
      return { status: 401, body: { error: 'UNAUTHENTICATED' } };
    }

    const auth = this.authService.authenticate(token);
    const format = parseExportFormat(request.body);
    const generated = await this.exportService.createExport(auth.user.id, auth.user.id, format);

    return {
      status: 201,
      body: {
        export_id: generated.id,
        format: generated.format,
        created_at: generated.created_at,
        download_url: `/exports/${generated.id}/download`,
      },
    };
  }

  private downloadExport(request: RequestLike): ResponseLike {
    const token = parseBearer(request.headers?.authorization);
    if (!token) {
      return { status: 401, body: { error: 'UNAUTHENTICATED' } };
    }

    const auth = this.authService.authenticate(token);
    const exportId = request.path.replace('/exports/', '').replace('/download', '');
    const record = this.exportService.getExport(auth.user.id, exportId);

    return {
      status: 200,
      body: {
        export_id: record.id,
        file_name: record.file_name,
        mime_type: record.mime_type,
        content_base64: record.payload,
      },
    };
  }

  private listExportAuditLogs(request: RequestLike): ResponseLike {
    const token = parseBearer(request.headers?.authorization);
    if (!token) {
      return { status: 401, body: { error: 'UNAUTHENTICATED' } };
    }

    const auth = this.authService.authenticate(token);
    const entries = this.exportService.listAuditByOwner(auth.user.id);
    return { status: 200, body: { entries } };
  }

  private mapError(error: unknown): ResponseLike {
    if (!(error instanceof Error)) {
      return { status: 500, body: { error: 'INTERNAL_ERROR' } };
    }

    if (error.message === 'EMAIL_ALREADY_USED') {
      return { status: 409, body: { error: error.message } };
    }

    if (
      error.message === 'INVALID_CREDENTIALS' ||
      error.message === 'UNAUTHENTICATED' ||
      error.message === 'SESSION_INVALID' ||
      error.message === 'SESSION_NOT_FOUND'
    ) {
      return { status: 401, body: { error: error.message } };
    }

    if (error.message === 'INVALID_PAYLOAD') {
      return { status: 400, body: { error: error.message } };
    }

    if (error.message === 'EXPORT_NOT_FOUND') {
      return { status: 404, body: { error: error.message } };
    }

    return { status: 500, body: { error: 'INTERNAL_ERROR' } };
  }
}
