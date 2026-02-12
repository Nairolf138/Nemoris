declare module 'node:child_process' {
  export function execFileSync(command: string, args?: string[], options?: { encoding?: string }): string;
  export function spawnSync(
    command: string,
    args?: string[],
    options?: { encoding?: string },
  ): { status: number | null; stdout: string; stderr: string };
}
