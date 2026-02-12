import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { CapsuleApiApp } from './app.js';
import { ApiError, ValidationError } from './errors.js';
import type { RequestLike, ResponseLike } from './types.js';

const DEFAULT_PORT = 3000;
const MAX_BODY_BYTES = 1024 * 1024;

const app = new CapsuleApiApp();
let isShuttingDown = false;

const isJsonContentType = (value: string | string[] | undefined): boolean => {
  const normalized = Array.isArray(value) ? value[0] : value;
  if (!normalized) {
    return false;
  }
  return normalized.split(';')[0]?.trim().toLowerCase() === 'application/json';
};

const readBody = async (request: IncomingMessage): Promise<unknown> => {
  const method = request.method?.toUpperCase() ?? 'GET';
  if (method === 'GET' || method === 'HEAD' || method === 'DELETE') {
    return undefined;
  }

  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of request) {
    const buffer = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
    total += buffer.length;
    if (total > MAX_BODY_BYTES) {
      throw new ApiError('INVALID_PAYLOAD', 413, { message: 'Payload too large.' });
    }
    chunks.push(buffer);
  }

  if (chunks.length === 0) {
    return undefined;
  }

  if (!isJsonContentType(request.headers['content-type'])) {
    throw new ValidationError('INVALID_PAYLOAD', {
      message: 'Unsupported Content-Type. Use application/json.',
    });
  }

  const rawBody = Buffer.concat(chunks).toString('utf8');
  try {
    return JSON.parse(rawBody);
  } catch {
    throw new ValidationError('INVALID_PAYLOAD', { message: 'Malformed JSON body.' });
  }
};

const normalizeHeaders = (headers: IncomingMessage['headers']): Record<string, string | undefined> => {
  const normalized: Record<string, string | undefined> = {};
  for (const name of Object.keys(headers)) {
    const value = headers[name];
    if (Array.isArray(value)) {
      normalized[name.toLowerCase()] = value.join(', ');
      continue;
    }
    normalized[name.toLowerCase()] = value;
  }
  return normalized;
};

const toRequestLike = async (request: IncomingMessage): Promise<RequestLike> => {
  const method = request.method?.toUpperCase();
  if (!method) {
    throw new ValidationError('INVALID_PAYLOAD', { message: 'Missing HTTP method.' });
  }

  const host = request.headers.host ?? 'localhost';
  const url = new URL(request.url ?? '/', `http://${host}`);

  const queryParams = new URLSearchParams(url.search);
  for (const [key, value] of queryParams.entries()) {
    if (key.trim().length === 0 || value.trim().length === 0) {
      throw new ValidationError('INVALID_QUERY_PARAMS');
    }
  }

  const body = await readBody(request);

  return {
    method,
    path: `${url.pathname}${url.search}`,
    headers: normalizeHeaders(request.headers),
    body,
  };
};

const writeJson = (response: ServerResponse, status: number, payload: unknown): void => {
  response.statusCode = status;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  if (payload === null || payload === undefined) {
    response.end();
    return;
  }
  response.end(JSON.stringify(payload));
};

const writeResponse = (response: ServerResponse, payload: ResponseLike): void => {
  if (payload.status === 204) {
    response.statusCode = 204;
    response.end();
    return;
  }
  writeJson(response, payload.status, payload.body);
};

const server = createServer(async (request, response) => {
  try {
    const method = request.method?.toUpperCase();
    const path = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`).pathname;

    if (method === 'GET' && path === '/health') {
      writeJson(response, 200, { status: 'ok' });
      return;
    }

    if (method === 'GET' && path === '/ready') {
      if (isShuttingDown) {
        writeJson(response, 503, { status: 'stopping' });
        return;
      }
      writeJson(response, 200, { status: 'ready' });
      return;
    }

    if (isShuttingDown) {
      writeJson(response, 503, { error: 'SERVICE_UNAVAILABLE', message: 'Server shutting down.' });
      return;
    }

    const requestLike = await toRequestLike(request);
    const appResponse = await app.handle(requestLike);
    writeResponse(response, appResponse);
  } catch (error) {
    const apiError = error instanceof ApiError ? error : new ApiError('INTERNAL_ERROR', 500);
    writeJson(response, apiError.httpStatus, apiError.toPayload());
  }
});

const port = Number(process.env.PORT ?? DEFAULT_PORT);

server.listen(port, () => {
  console.log(`[capsule-api] listening on http://0.0.0.0:${port}`);
});

const shutdown = (signal: NodeJS.Signals): void => {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;
  console.log(`[capsule-api] received ${signal}, shutting down gracefully...`);

  server.close((error) => {
    if (error) {
      console.error('[capsule-api] shutdown error', error);
      process.exitCode = 1;
      return;
    }
    console.log('[capsule-api] shutdown complete');
  });

  setTimeout(() => {
    console.error('[capsule-api] force shutdown after timeout');
    process.exit(1);
  }, 10_000).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
