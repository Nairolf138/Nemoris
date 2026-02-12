import type { ResponseLike, RequestLike } from './types.js';
import { AuthService } from './auth-service.js';

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

export class CapsuleApiApp {
  private authService = new AuthService();

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

    return { status: 500, body: { error: 'INTERNAL_ERROR' } };
  }
}
