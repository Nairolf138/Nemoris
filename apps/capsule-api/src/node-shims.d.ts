declare module 'node:child_process' {
  export function execFileSync(command: string, args?: string[], options?: { encoding?: string }): string;
  export function spawnSync(
    command: string,
    args?: string[],
    options?: { encoding?: string },
  ): { status: number | null; stdout: string; stderr: string };
}

declare module 'node:http' {
  export interface IncomingMessage {
    method?: string;
    url?: string;
    headers: Record<string, string | string[] | undefined>;
    [Symbol.asyncIterator](): AsyncIterableIterator<Uint8Array | string>;
  }

  export interface ServerResponse {
    statusCode: number;
    setHeader(name: string, value: string): void;
    end(chunk?: string): void;
  }

  export interface Server {
    listen(port: number, callback?: () => void): void;
    close(callback?: (error?: Error) => void): void;
  }

  export function createServer(
    listener: (request: IncomingMessage, response: ServerResponse) => void | Promise<void>,
  ): Server;
}

declare class Buffer {
  public readonly length: number;
  public static from(value: string): Buffer;
  public static concat(values: readonly Buffer[]): Buffer;
  public toString(encoding?: string): string;
}

declare namespace NodeJS {
  type Signals = 'SIGINT' | 'SIGTERM';
}

declare namespace process {
  const env: Record<string, string | undefined>;
  let exitCode: number | undefined;
  function on(signal: NodeJS.Signals, listener: () => void): void;
  function exit(code?: number): never;
}

declare function setTimeout(handler: () => void, timeout?: number): { unref(): void };
