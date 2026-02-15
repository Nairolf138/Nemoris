import { createCapsuleFrontend } from '../app.js';
import { appRoutes, getRouteNameByPath, resolveRoute } from '../routes.js';

const assert = (condition: unknown, message: string): void => {
  if (!condition) {
    throw new Error(message);
  }
};

const createMemoryStorage = (): Storage => {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
    clear: () => {
      data.clear();
    },
    key: (index: number) => Array.from(data.keys())[index] ?? null,
    get length() {
      return data.size;
    },
  };
};

const runRouteGuardsTest = (): void => {
  assert(getRouteNameByPath('/unknown') === 'dashboard', 'unknown path should fallback to dashboard route');
  assert(
    resolveRoute('beliefs', { hasSession: false, hasCompletedOnboarding: true, onboardingStep: 'identityContact' }) === appRoutes.login,
    'beliefs route should redirect to login when session is missing',
  );
  assert(
    resolveRoute('lessons', { hasSession: true, hasCompletedOnboarding: false, onboardingStep: 'documents' }) === appRoutes.onboardingDocuments,
    'lessons route should redirect to current onboarding step when onboarding is not complete',
  );

  const frontend = createCapsuleFrontend('http://localhost:4000', createMemoryStorage());
  assert(
    frontend.navigate('dashboard') === appRoutes.onboardingIdentityContact,
    'navigate should enforce onboarding before dashboard access',
  );

  frontend.store.setState({ onboardingCompleted: true });
  assert(frontend.navigate('dashboard') === appRoutes.login, 'navigate should enforce login after onboarding completion');

  frontend.store.setState({
    onboardingCompleted: true,
    session: {
      user: { id: 'owner-1', email: 'owner@example.com', created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z' },
      session: { token: 'token-1', user_id: 'owner-1', expires_at: new Date(Date.now() + 60_000).toISOString() },
    },
  });
  assert(frontend.navigate('beliefs') === appRoutes.beliefs, 'navigate should allow beliefs route for authenticated users');
};

const runTimelineNavigationTest = async (): Promise<void> => {
  const frontend = createCapsuleFrontend('http://localhost:4000', createMemoryStorage());
  frontend.store.setState({
    onboardingCompleted: true,
    session: {
      user: { id: 'owner-2', email: 'owner2@example.com', created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z' },
      session: { token: 'token-2', user_id: 'owner-2', expires_at: new Date(Date.now() + 60_000).toISOString() },
    },
  });

  frontend.sessionManager.saveSession({
    user: { id: 'owner-2', email: 'owner2@example.com', created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z' },
    session: { token: 'token-2', user_id: 'owner-2', expires_at: new Date(Date.now() + 60_000).toISOString() },
  });

  const requests: string[] = [];
  const nodeA = {
    id: 'node-a',
    owner_id: 'owner-2',
    visibility: 'private',
    created_at: '2024-01-02T10:00:00.000Z',
    updated_at: '2024-01-02T10:00:00.000Z',
    node_type: 'event',
    label: 'Node A',
    memory_ids: [],
    belief_ids: [],
    lesson_ids: [],
    value_profile_ids: [],
  };
  const nodeB = {
    ...nodeA,
    id: 'node-b',
    label: 'Node B',
    created_at: '2024-01-03T10:00:00.000Z',
    updated_at: '2024-01-03T10:00:00.000Z',
  };

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    requests.push(`${init?.method ?? 'GET'} ${url}`);

    if (url.endsWith('/narrative-nodes')) {
      return new Response(JSON.stringify([nodeA, nodeB]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (url.endsWith('/narrative-edges') && (init?.method ?? 'GET') === 'GET') {
      return new Response(
        JSON.stringify([
          {
            id: 'edge-a-b',
            owner_id: 'owner-2',
            visibility: 'private',
            created_at: '2024-01-03T12:00:00.000Z',
            updated_at: '2024-01-03T12:00:00.000Z',
            from_node_id: 'node-a',
            to_node_id: 'node-b',
            relation_type: 'follows',
            evidence_memory_ids: [],
            belief_ids: [],
            lesson_ids: [],
          },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }
    if (url.endsWith('/memories')) {
      return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (url.endsWith('/narrative-edges') && init?.method === 'POST') {
      return new Response(
        JSON.stringify({
          id: 'edge-manual',
          owner_id: 'owner-2',
          visibility: 'private',
          created_at: '2024-01-03T13:00:00.000Z',
          updated_at: '2024-01-03T13:00:00.000Z',
          from_node_id: 'node-b',
          to_node_id: 'node-a',
          relation_type: 'supports',
          evidence_memory_ids: [],
          belief_ids: [],
          lesson_ids: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify({ error: 'NOT_FOUND' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;

  try {
    const timeline = await frontend.timeline.loadTimeline();
    assert(timeline.length === 2, 'timeline should contain both nodes');
    assert(timeline[0]?.id === 'node-a', 'timeline should be sorted by date ascending');
    assert(timeline[0]?.links.includes('node-b'), 'timeline event should expose linked target node ids');

    const created = await frontend.timeline.addManualLink({
      fromNodeId: 'node-b',
      toNodeId: 'node-a',
      relationType: 'supports',
    });
    assert(created.id === 'edge-manual', 'manual link creation should return created edge');

    assert(requests.some((entry) => entry.includes('GET http://localhost:4000/narrative-nodes')), 'timeline load should call narrative nodes endpoint');
    assert(requests.some((entry) => entry.includes('POST http://localhost:4000/narrative-edges')), 'manual link should call narrative edges endpoint');
  } finally {
    globalThis.fetch = originalFetch;
  }
};

export const runNavigationIntegrationTests = async (): Promise<void> => {
  runRouteGuardsTest();
  await runTimelineNavigationTest();
  console.log('capsule app navigation integration tests passed.');
};
