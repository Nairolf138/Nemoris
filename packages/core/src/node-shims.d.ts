declare module 'node:child_process' {
  export function execFileSync(command: string, args?: string[], options?: { encoding?: string }): string;
}
