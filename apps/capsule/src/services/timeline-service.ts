import type { NarrativeEdge, NarrativeNode } from '@capsule/core';
import type { CapsuleApiClient } from '../api-client.js';
import type { SessionManager } from '../session.js';
import type { CapsuleStore } from '../state.js';

export interface TimelineEvent {
  id: string;
  date: string;
  type: string;
  label: string;
  links: string[];
}

export interface ManualLinkInput {
  fromNodeId: string;
  toNodeId: string;
  relationType: NarrativeEdge['relation_type'];
  evidenceMemoryIds?: string[];
}

export class TimelineService {
  public constructor(
    private readonly api: CapsuleApiClient,
    private readonly sessionManager: SessionManager,
    private readonly store: CapsuleStore,
  ) {}

  private getAuth(): { token: string; ownerId: string } {
    const session = this.sessionManager.readSession();
    if (!session) throw new Error('Not authenticated');
    return { token: session.session.token, ownerId: session.user.id };
  }

  public async loadTimeline(): Promise<TimelineEvent[]> {
    const { token, ownerId } = this.getAuth();
    const [nodesResult, edgesResult, memoriesResult] = await Promise.allSettled([
      this.api.listCollection('narrativeNodes', token, ownerId),
      this.api.listCollection('narrativeEdges', token, ownerId),
      this.api.listCollection('memories', token, ownerId),
    ]);

    if (nodesResult.status === 'rejected') throw nodesResult.reason;
    if (edgesResult.status === 'rejected') throw edgesResult.reason;

    const nodes = nodesResult.value;
    const edges = edgesResult.value;
    const memories = memoriesResult.status === 'fulfilled' ? memoriesResult.value : this.store.getState().data.memories;

    this.store.setState({ data: { narrativeNodes: nodes, narrativeEdges: edges, memories } });
    return this.buildTimeline(nodes, edges);
  }

  private toTimestamp(date: string): number {
    const parsed = Date.parse(date);
    return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
  }

  public buildTimeline(nodes: NarrativeNode[], edges: NarrativeEdge[]): TimelineEvent[] {
    const linksByNode = new Map<string, string[]>();
    edges.forEach((edge) => {
      linksByNode.set(edge.from_node_id, [...(linksByNode.get(edge.from_node_id) ?? []), edge.to_node_id]);
    });

    return nodes
      .map((node) => ({
        id: node.id,
        date: node.occurred_at ?? node.created_at,
        type: node.node_type,
        label: node.label,
        links: linksByNode.get(node.id) ?? [],
      }))
      .sort((a, b) => {
        const dateOrder = this.toTimestamp(a.date) - this.toTimestamp(b.date);
        if (dateOrder !== 0) return dateOrder;
        return a.id.localeCompare(b.id);
      });
  }

  public async addManualLink(input: ManualLinkInput): Promise<NarrativeEdge> {
    const { token, ownerId } = this.getAuth();
    const created = await this.api.createCollectionItem('narrativeEdges', token, ownerId, {
      from_node_id: input.fromNodeId,
      to_node_id: input.toNodeId,
      relation_type: input.relationType,
      evidence_memory_ids: input.evidenceMemoryIds ?? [],
      belief_ids: [],
      lesson_ids: [],
      visibility: 'private',
    });

    this.store.setState({
      data: {
        narrativeEdges: [...this.store.getState().data.narrativeEdges, created],
      },
    });

    return created;
  }
}
