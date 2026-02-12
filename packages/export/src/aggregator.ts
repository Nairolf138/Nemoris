import type {
  BeliefRepository,
  LegacyMessageRepository,
  LessonRepository,
  MemoryRepository,
  ValueProfileRepository,
} from '@capsule/core';
import type { CapsuleExportPayloadV1 } from './schema.js';

export interface ExportAggregatorDependencies {
  memories: MemoryRepository;
  beliefs: BeliefRepository;
  lessons: LessonRepository;
  valueProfiles: ValueProfileRepository;
  legacyMessages: LegacyMessageRepository;
}

export class ExportAggregator {
  public constructor(private readonly deps: ExportAggregatorDependencies) {}

  public async collectByOwner(ownerId: string, generatedByUserId: string): Promise<CapsuleExportPayloadV1> {
    const [memories, beliefs, lessons, valueProfiles, legacyMessages] = await Promise.all([
      this.deps.memories.listByOwner(ownerId),
      this.deps.beliefs.listByOwner(ownerId),
      this.deps.lessons.listByOwner(ownerId),
      this.deps.valueProfiles.listByOwner(ownerId),
      this.deps.legacyMessages.listByOwner(ownerId),
    ]);

    return {
      metadata: {
        schema_version: '1.0.0',
        exported_at: new Date().toISOString(),
        owner_id: ownerId,
        generated_by_user_id: generatedByUserId,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC',
      },
      memories,
      beliefs,
      lessons,
      value_profiles: valueProfiles,
      legacy_messages: legacyMessages,
    };
  }
}
