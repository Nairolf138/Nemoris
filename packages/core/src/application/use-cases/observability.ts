export interface UseCaseEventInput {
  event_name: string;
  user_id: string;
  entity_id: string;
  metadata?: Record<string, unknown>;
}

export interface UseCaseObserver {
  emitEvent(input: UseCaseEventInput): void;
}
