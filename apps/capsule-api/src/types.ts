export interface RequestLike {
  method: string;
  path: string;
  headers?: Record<string, string | undefined>;
  body?: unknown;
}

export interface ResponseLike {
  status: number;
  body: unknown;
}

export type Handler = (request: RequestLike) => Promise<ResponseLike>;
