export type Visibility = 'private' | 'trusted_circle' | 'public' | 'posthumous';

export interface BaseEntity {
  id: string;
  owner_id: string;
  visibility: Visibility;
  created_at: string;
  updated_at: string;
}

export interface Memory extends BaseEntity {
  occurred_at: string;
  title: string;
  description?: string;
  memory_type?: 'event' | 'document' | 'media' | 'note';
  related_belief_ids: string[];
  related_lesson_ids: string[];
  related_value_profile_ids: string[];
  related_narrative_node_ids: string[];
}

export interface Belief extends BaseEntity {
  belief_key: string;
  statement: string;
  confidence_score?: number;
  status: 'active' | 'revised' | 'discarded';
  current_version_number: number;
  evidence_memory_ids: string[];
  related_lesson_ids: string[];
  previous_belief_id?: string;
}

export interface BeliefVersion extends BaseEntity {
  belief_id: string;
  version_number: number;
  statement: string;
  confidence_score?: number;
  change_reason?: string;
  evidence_memory_ids: string[];
}

export interface Lesson extends BaseEntity {
  title: string;
  context?: string;
  lesson_text: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  source_memory_ids: string[];
  linked_belief_ids: string[];
  linked_value_profile_ids: string[];
}

export interface ValueProfile extends BaseEntity {
  profile_label: string;
  age_range?: string;
  values: ValueScore[];
  current_version_number: number;
  evidence_memory_ids: string[];
  narrative_node_ids: string[];
}

export interface ValueProfileVersion extends BaseEntity {
  value_profile_id: string;
  version_number: number;
  values: ValueScore[];
  change_note?: string;
  evidence_memory_ids: string[];
}

export interface ValueScore {
  value_id: string;
  label: string;
  score: number;
}

export interface NarrativeNode extends BaseEntity {
  node_type: 'event' | 'person' | 'decision' | 'belief_shift' | 'lesson';
  label: string;
  description?: string;
  occurred_at?: string;
  memory_ids: string[];
  belief_ids: string[];
  lesson_ids: string[];
  value_profile_ids: string[];
}

export interface NarrativeEdge extends BaseEntity {
  from_node_id: string;
  to_node_id: string;
  relation_type: 'causes' | 'influences' | 'contradicts' | 'supports' | 'follows';
  weight?: number;
  evidence_memory_ids: string[];
  belief_ids: string[];
  lesson_ids: string[];
}

export interface LegacyMessage extends BaseEntity {
  title: string;
  message: string;
  trigger_type: 'manual' | 'date' | 'inactivity' | 'verified_death';
  trigger_at?: string;
  recipient_ids: string[];
  attachment_memory_ids: string[];
  related_belief_ids: string[];
  related_lesson_ids: string[];
  related_value_profile_ids: string[];
  related_narrative_node_ids: string[];
  delivery_status: 'draft' | 'armed' | 'sent' | 'revoked';
}
