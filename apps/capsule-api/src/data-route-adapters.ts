import type {
  Belief,
  CreateBeliefInput,
  CreateLegacyMessageInput,
  CreateLessonInput,
  CreateMemoryInput,
  CreateValueProfileInput,
  LegacyMessage,
  Lesson,
  Memory,
  UpdateBeliefInput,
  UpdateLegacyMessageInput,
  UpdateLessonInput,
  UpdateMemoryInput,
  UpdateValueProfileInput,
  ValueProfile,
  Visibility,
} from '@capsule/core';

const asRecord = (body: unknown): Record<string, unknown> => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('INVALID_PAYLOAD');
  }
  return body as Record<string, unknown>;
};

const asString = (payload: Record<string, unknown>, key: string, required = false): string | undefined => {
  const value = payload[key];
  if (value === undefined || value === null) {
    if (required) {
      throw new Error('INVALID_PAYLOAD');
    }
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new Error('INVALID_PAYLOAD');
  }
  return value;
};

const asNumber = (payload: Record<string, unknown>, key: string, required = false): number | undefined => {
  const value = payload[key];
  if (value === undefined || value === null) {
    if (required) {
      throw new Error('INVALID_PAYLOAD');
    }
    return undefined;
  }
  if (typeof value !== 'number') {
    throw new Error('INVALID_PAYLOAD');
  }
  return value;
};

const asStringArray = (payload: Record<string, unknown>, key: string, required = false): string[] => {
  const value = payload[key];
  if (value === undefined || value === null) {
    if (required) {
      throw new Error('INVALID_PAYLOAD');
    }
    return [];
  }
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error('INVALID_PAYLOAD');
  }
  return value;
};

const asVisibility = (payload: Record<string, unknown>, required = false): Visibility | undefined => {
  const value = asString(payload, 'visibility', required);
  return value as Visibility | undefined;
};

const asValues = (payload: Record<string, unknown>, required = false): ValueProfile['values'] | undefined => {
  const value = payload.values;
  if (value === undefined || value === null) {
    if (required) {
      throw new Error('INVALID_PAYLOAD');
    }
    return undefined;
  }
  if (!Array.isArray(value)) {
    throw new Error('INVALID_PAYLOAD');
  }
  return value.map((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error('INVALID_PAYLOAD');
    }
    const row = entry as Record<string, unknown>;
    if (typeof row.value_id !== 'string' || typeof row.label !== 'string' || typeof row.score !== 'number') {
      throw new Error('INVALID_PAYLOAD');
    }
    return { value_id: row.value_id, label: row.label, score: row.score };
  });
};

export const mapCreateMemoryInput = (body: unknown, ownerId: string): CreateMemoryInput => {
  const payload = asRecord(body);
  return {
    owner_id: ownerId,
    visibility: asVisibility(payload, true) as Memory['visibility'],
    occurred_at: asString(payload, 'occurred_at', true) as string,
    title: asString(payload, 'title', true) as string,
    description: asString(payload, 'description'),
    memory_type: asString(payload, 'memory_type') as Memory['memory_type'],
    related_belief_ids: asStringArray(payload, 'related_belief_ids'),
    related_lesson_ids: asStringArray(payload, 'related_lesson_ids'),
    related_value_profile_ids: asStringArray(payload, 'related_value_profile_ids'),
    related_narrative_node_ids: asStringArray(payload, 'related_narrative_node_ids'),
  };
};

export const mapUpdateMemoryInput = (body: unknown): UpdateMemoryInput => {
  const payload = asRecord(body);
  return {
    visibility: asVisibility(payload),
    occurred_at: asString(payload, 'occurred_at'),
    title: asString(payload, 'title'),
    description: asString(payload, 'description'),
    memory_type: asString(payload, 'memory_type') as Memory['memory_type'],
    related_belief_ids: payload.related_belief_ids === undefined ? undefined : asStringArray(payload, 'related_belief_ids'),
    related_lesson_ids: payload.related_lesson_ids === undefined ? undefined : asStringArray(payload, 'related_lesson_ids'),
    related_value_profile_ids:
      payload.related_value_profile_ids === undefined ? undefined : asStringArray(payload, 'related_value_profile_ids'),
    related_narrative_node_ids:
      payload.related_narrative_node_ids === undefined ? undefined : asStringArray(payload, 'related_narrative_node_ids'),
  };
};

export const mapCreateBeliefInput = (body: unknown, ownerId: string): CreateBeliefInput => {
  const payload = asRecord(body);
  return {
    owner_id: ownerId,
    visibility: asVisibility(payload, true) as Belief['visibility'],
    belief_key: asString(payload, 'belief_key', true) as string,
    statement: asString(payload, 'statement', true) as string,
    confidence_score: asNumber(payload, 'confidence_score'),
    status: asString(payload, 'status', true) as Belief['status'],
    current_version_number: asNumber(payload, 'current_version_number', true) as number,
    evidence_memory_ids: asStringArray(payload, 'evidence_memory_ids'),
    related_lesson_ids: asStringArray(payload, 'related_lesson_ids'),
    previous_belief_id: asString(payload, 'previous_belief_id'),
  };
};

export const mapUpdateBeliefInput = (body: unknown): UpdateBeliefInput => {
  const payload = asRecord(body);
  return {
    visibility: asVisibility(payload),
    belief_key: asString(payload, 'belief_key'),
    statement: asString(payload, 'statement'),
    confidence_score: asNumber(payload, 'confidence_score'),
    status: asString(payload, 'status') as Belief['status'],
    current_version_number: asNumber(payload, 'current_version_number'),
    evidence_memory_ids: payload.evidence_memory_ids === undefined ? undefined : asStringArray(payload, 'evidence_memory_ids'),
    related_lesson_ids: payload.related_lesson_ids === undefined ? undefined : asStringArray(payload, 'related_lesson_ids'),
    previous_belief_id: asString(payload, 'previous_belief_id'),
  };
};

export const mapCreateLessonInput = (body: unknown, ownerId: string): CreateLessonInput => {
  const payload = asRecord(body);
  return {
    owner_id: ownerId,
    visibility: asVisibility(payload, true) as Lesson['visibility'],
    title: asString(payload, 'title', true) as string,
    context: asString(payload, 'context'),
    lesson_text: asString(payload, 'lesson_text', true) as string,
    severity: asString(payload, 'severity') as Lesson['severity'],
    source_memory_ids: asStringArray(payload, 'source_memory_ids'),
    linked_belief_ids: asStringArray(payload, 'linked_belief_ids'),
    linked_value_profile_ids: asStringArray(payload, 'linked_value_profile_ids'),
  };
};

export const mapUpdateLessonInput = (body: unknown): UpdateLessonInput => {
  const payload = asRecord(body);
  return {
    visibility: asVisibility(payload),
    title: asString(payload, 'title'),
    context: asString(payload, 'context'),
    lesson_text: asString(payload, 'lesson_text'),
    severity: asString(payload, 'severity') as Lesson['severity'],
    source_memory_ids: payload.source_memory_ids === undefined ? undefined : asStringArray(payload, 'source_memory_ids'),
    linked_belief_ids: payload.linked_belief_ids === undefined ? undefined : asStringArray(payload, 'linked_belief_ids'),
    linked_value_profile_ids:
      payload.linked_value_profile_ids === undefined ? undefined : asStringArray(payload, 'linked_value_profile_ids'),
  };
};

export const mapCreateValueProfileInput = (body: unknown, ownerId: string): CreateValueProfileInput => {
  const payload = asRecord(body);
  return {
    owner_id: ownerId,
    visibility: asVisibility(payload, true) as ValueProfile['visibility'],
    profile_label: asString(payload, 'profile_label', true) as string,
    age_range: asString(payload, 'age_range'),
    values: asValues(payload, true) as ValueProfile['values'],
    current_version_number: asNumber(payload, 'current_version_number', true) as number,
    evidence_memory_ids: asStringArray(payload, 'evidence_memory_ids'),
    narrative_node_ids: asStringArray(payload, 'narrative_node_ids'),
  };
};

export const mapUpdateValueProfileInput = (body: unknown): UpdateValueProfileInput => {
  const payload = asRecord(body);
  return {
    visibility: asVisibility(payload),
    profile_label: asString(payload, 'profile_label'),
    age_range: asString(payload, 'age_range'),
    values: asValues(payload),
    current_version_number: asNumber(payload, 'current_version_number'),
    evidence_memory_ids: payload.evidence_memory_ids === undefined ? undefined : asStringArray(payload, 'evidence_memory_ids'),
    narrative_node_ids: payload.narrative_node_ids === undefined ? undefined : asStringArray(payload, 'narrative_node_ids'),
  };
};

export const mapCreateLegacyMessageInput = (body: unknown, ownerId: string): CreateLegacyMessageInput => {
  const payload = asRecord(body);
  return {
    owner_id: ownerId,
    visibility: asVisibility(payload, true) as LegacyMessage['visibility'],
    title: asString(payload, 'title', true) as string,
    message: asString(payload, 'message', true) as string,
    trigger_type: asString(payload, 'trigger_type', true) as LegacyMessage['trigger_type'],
    trigger_at: asString(payload, 'trigger_at'),
    recipient_ids: asStringArray(payload, 'recipient_ids'),
    attachment_memory_ids: asStringArray(payload, 'attachment_memory_ids'),
    related_belief_ids: asStringArray(payload, 'related_belief_ids'),
    related_lesson_ids: asStringArray(payload, 'related_lesson_ids'),
    related_value_profile_ids: asStringArray(payload, 'related_value_profile_ids'),
    related_narrative_node_ids: asStringArray(payload, 'related_narrative_node_ids'),
    delivery_status: asString(payload, 'delivery_status', true) as LegacyMessage['delivery_status'],
  };
};

export const mapUpdateLegacyMessageInput = (body: unknown): UpdateLegacyMessageInput => {
  const payload = asRecord(body);
  return {
    visibility: asVisibility(payload),
    title: asString(payload, 'title'),
    message: asString(payload, 'message'),
    trigger_type: asString(payload, 'trigger_type') as LegacyMessage['trigger_type'],
    trigger_at: asString(payload, 'trigger_at'),
    recipient_ids: payload.recipient_ids === undefined ? undefined : asStringArray(payload, 'recipient_ids'),
    attachment_memory_ids:
      payload.attachment_memory_ids === undefined ? undefined : asStringArray(payload, 'attachment_memory_ids'),
    related_belief_ids: payload.related_belief_ids === undefined ? undefined : asStringArray(payload, 'related_belief_ids'),
    related_lesson_ids: payload.related_lesson_ids === undefined ? undefined : asStringArray(payload, 'related_lesson_ids'),
    related_value_profile_ids:
      payload.related_value_profile_ids === undefined ? undefined : asStringArray(payload, 'related_value_profile_ids'),
    related_narrative_node_ids:
      payload.related_narrative_node_ids === undefined ? undefined : asStringArray(payload, 'related_narrative_node_ids'),
    delivery_status: asString(payload, 'delivery_status') as LegacyMessage['delivery_status'],
  };
};
