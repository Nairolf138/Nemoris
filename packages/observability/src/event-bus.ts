import type { StandardEvent } from './types.js';

export type EventListener = (event: StandardEvent) => void;

export class ObservabilityEventBus {
  private readonly events: StandardEvent[] = [];
  private readonly listeners = new Set<EventListener>();

  public emit(event: StandardEvent): StandardEvent {
    this.events.push(event);
    this.listeners.forEach((listener) => listener(event));
    return event;
  }

  public listEvents(): StandardEvent[] {
    return [...this.events];
  }

  public subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
