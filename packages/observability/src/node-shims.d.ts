declare module 'node:child_process' {
  export function execFileSync(command: string, args?: readonly string[], options?: { encoding?: string }): string;
}

declare module 'node:fs' {
  export function mkdirSync(path: string, options?: { recursive?: boolean }): void;
}

declare module 'node:path' {
  export function dirname(path: string): string;
  export function resolve(...paths: string[]): string;
}
