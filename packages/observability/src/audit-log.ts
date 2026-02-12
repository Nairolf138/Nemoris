import type { AuditLogEntry, StandardEvent } from './types.js';

export class ImmutableAuditLog {
  private readonly entries: AuditLogEntry[] = [];

  public append(event: StandardEvent): AuditLogEntry {
    const entry: AuditLogEntry = {
      ...event,
      sequence: this.entries.length + 1,
    };
    this.entries.push(entry);
    return entry;
  }

  public list(): AuditLogEntry[] {
    return [...this.entries];
  }
}
