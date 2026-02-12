import type { Memory } from '@capsule/core';
import { UI_PACKAGE } from '@capsule/ui';

export type CapsuleBootstrap = {
  memoryCount: number;
  uiPackage: string;
};

export const bootstrapCapsule = (memories: Memory[]): CapsuleBootstrap => ({
  memoryCount: memories.length,
  uiPackage: UI_PACKAGE,
});
