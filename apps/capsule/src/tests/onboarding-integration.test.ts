import { createCapsuleFrontend } from '../app.js';
import { appRoutes } from '../routes.js';
import { ONBOARDING_STEP_ORDER } from '../services/onboarding-service.js';

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

export const runOnboardingIntegrationTests = async (): Promise<void> => {
  const storage = createMemoryStorage();
  const frontend = createCapsuleFrontend('http://localhost:4000', storage);

  const authSession = {
    user: { id: 'owner-3', email: 'owner3@example.com', created_at: '2024-01-01T00:00:00.000Z', updated_at: '2024-01-01T00:00:00.000Z' },
    session: { token: 'token-3', user_id: 'owner-3', expires_at: new Date(Date.now() + 60_000).toISOString() },
  };
  frontend.sessionManager.saveSession(authSession);
  frontend.store.setState({ session: authSession });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};

    if (url.endsWith('/beneficiaries') && init?.method === 'POST') {
      return new Response(
        JSON.stringify({
          id: body.identity === 'Alice' ? 'bene-1' : `bene-${String(body.identity).toLowerCase()}`,
          owner_id: 'owner-3',
          visibility: 'private',
          identity: body.identity,
          channel: body.channel,
          contact: body.contact,
          verification_status: 'pending',
          status: 'active',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (url.endsWith('/legacy-messages') && init?.method === 'POST') {
      return new Response(
        JSON.stringify({
          id: 'legacy-1',
          owner_id: 'owner-3',
          visibility: 'private',
          title: body.title,
          message: body.message,
          trigger_type: body.trigger_type,
          beneficiary_ids: body.beneficiary_ids ?? [],
          attachment_memory_ids: [],
          related_belief_ids: [],
          related_lesson_ids: [],
          related_value_profile_ids: [],
          related_narrative_node_ids: [],
          state: 'draft',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (url.endsWith('/external-attachments') && init?.method === 'POST') {
      return new Response(
        JSON.stringify({
          id: `att-${String(body.label).toLowerCase().replace(/\s+/g, '-')}`,
          owner_id: 'owner-3',
          visibility: body.visibility ?? 'private',
          label: body.label,
          url: body.url,
          type: body.type,
          notes: body.notes,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (url.includes('/legacy-messages/legacy-1') && init?.method === 'PATCH') {
      return new Response(
        JSON.stringify({
          id: 'legacy-1',
          owner_id: 'owner-3',
          visibility: 'private',
          title: 'Message',
          message: 'Body',
          trigger_type: 'manual',
          beneficiary_ids: body.beneficiary_ids ?? [],
          attachment_memory_ids: [],
          related_belief_ids: [],
          related_lesson_ids: [],
          related_value_profile_ids: [],
          related_narrative_node_ids: [],
          state: 'draft',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify({ error: 'NOT_FOUND', url }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;

  try {

    assert(ONBOARDING_STEP_ORDER.length === 4, 'onboarding should keep a strict 4-step flow');
    await frontend.onboarding.saveIdentityAndContact({ identity: 'Alice', channel: 'email', contact: 'alice@example.com' });
    assert(frontend.store.getState().onboardingStep === 'messages', 'identity step should advance to messages');
    assert(frontend.store.getState().completedSteps.includes('identityContact'), 'identity step should be marked as completed');

    await frontend.onboarding.saveMessages({ title: 'Message', message: 'Body', triggerType: 'manual' });
    assert(frontend.store.getState().onboardingStep === 'documents', 'messages step should advance to documents');
    assert(frontend.store.getState().completedSteps.includes('messages'), 'messages step should be marked as completed');

    await frontend.onboarding.saveImportantDocuments({ links: [{ label: 'Notaire', url: 'https://notaire.example/doc', type: 'document', visibility: 'private' }] });
    assert(frontend.store.getState().onboardingStep === 'beneficiariesRules', 'documents step should advance to beneficiaries and rules');
    assert(frontend.store.getState().completedSteps.includes('documents'), 'documents step should be marked as completed');

    await frontend.onboarding.saveBeneficiariesAndRules({
      beneficiaries: [{ identity: 'Bob', channel: 'email', contact: 'bob@example.com' }],
      minimumBeneficiaries: 1,
    });

    assert(frontend.store.getState().onboardingCompleted, 'last step should mark onboarding as complete');
    assert(frontend.store.getState().completedSteps.length === ONBOARDING_STEP_ORDER.length, 'onboarding completion should not require extra cognitive steps');
    assert(frontend.navigate('dashboard') === appRoutes.dashboard, 'onboarding completion should unlock dashboard route');

    const resumed = createCapsuleFrontend('http://localhost:4000', storage);
    assert(resumed.onboarding.resumeDraftStep() === 'identityContact', 'completed onboarding should not keep draft progress');
  } finally {
    globalThis.fetch = originalFetch;
  }

  console.log('capsule onboarding integration tests passed.');
};
