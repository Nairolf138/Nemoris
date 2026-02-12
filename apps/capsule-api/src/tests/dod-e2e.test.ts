import { CapsuleApiApp } from '../app.js';

export interface E2EScenarioResult {
  id: string;
  status: 'pass' | 'fail';
  details: string;
  deviation?: string;
}

const assert = (condition: unknown, message: string): void => {
  if (!condition) {
    throw new Error(message);
  }
};

type RuntimeEnv = Record<string, string | undefined>;

const runtimeEnv: RuntimeEnv =
  ((globalThis as { process?: { env?: RuntimeEnv } }).process?.env ?? {}) as RuntimeEnv;

declare const Buffer: {
  from(input: string, encoding: 'base64'): { toString(encoding: 'utf8'): string };
};

const grantExportConsent = async (app: CapsuleApiApp, ownerId: string, token: string): Promise<void> => {
  const consent = await app.handle({
    method: 'POST',
    path: '/consent/grant',
    headers: { authorization: `Bearer ${token}`, 'x-owner-id': ownerId },
    body: { owner_id: ownerId, scope: 'data_export', legal_basis: 'explicit_opt_in' },
  });
  assert(consent.status === 201, 'consent for data_export should return 201');
};

const runScenario = async (id: string, execute: () => Promise<string>): Promise<E2EScenarioResult> => {
  try {
    const details = await execute();
    return { id, status: 'pass', details };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      id,
      status: 'fail',
      details: `Échec du scénario ${id}.`,
      deviation: message,
    };
  }
};

const runCriticalPathScenario = async (): Promise<string> => {
  const app = new CapsuleApiApp();
  const register = await app.handle({
    method: 'POST',
    path: '/auth/register',
    body: { email: 'dod-e2e@example.com', password: 'Secret123!' },
    headers: { 'x-forwarded-for': '203.0.113.41' },
  });
  assert(register.status === 201, 'register should return 201');
  const registerBody = register.body as { user: { id: string }; session: { token: string } };
  const ownerId = registerBody.user.id;
  const token = registerBody.session.token;

  const belief = await app.handle({
    method: 'POST',
    path: '/data/beliefs',
    headers: { authorization: `Bearer ${token}`, 'x-owner-id': ownerId },
    body: {
      visibility: 'private',
      belief_key: 'belief-dod-e2e',
      statement: 'Les faits doivent être vérifiés.',
      status: 'active',
      current_version_number: 1,
      evidence_memory_ids: [],
      related_lesson_ids: [],
    },
  });
  assert(belief.status === 201, 'belief creation should return 201');
  const beliefId = (belief.body as { id: string }).id;

  const lesson = await app.handle({
    method: 'POST',
    path: '/data/lessons',
    headers: { authorization: `Bearer ${token}`, 'x-owner-id': ownerId },
    body: {
      visibility: 'private',
      title: 'Leçon DoD',
      lesson_text: 'Toujours lier un apprentissage à une preuve.',
      source_memory_ids: [],
      linked_belief_ids: [beliefId],
      linked_value_profile_ids: [],
    },
  });
  assert(lesson.status === 201, 'lesson creation should return 201');
  const lessonId = (lesson.body as { id: string }).id;

  const valueProfile = await app.handle({
    method: 'POST',
    path: '/data/value_profiles',
    headers: { authorization: `Bearer ${token}`, 'x-owner-id': ownerId },
    body: {
      visibility: 'private',
      profile_label: 'Valeurs DoD',
      values: [{ value_id: 'v-dod-e2e', label: 'Vérité', score: 90 }],
      current_version_number: 1,
      evidence_memory_ids: [],
      narrative_node_ids: [],
    },
  });
  assert(valueProfile.status === 201, 'value profile creation should return 201');
  const valueProfileId = (valueProfile.body as { id: string }).id;

  const memory = await app.handle({
    method: 'POST',
    path: '/data/memories',
    headers: { authorization: `Bearer ${token}`, 'x-owner-id': ownerId },
    body: {
      visibility: 'private',
      occurred_at: '2024-03-21T09:00:00.000Z',
      title: 'Souvenir DoD',
      description: 'Souvenir lié aux convictions, leçons et valeurs.',
      related_belief_ids: [beliefId],
      related_lesson_ids: [lessonId],
      related_value_profile_ids: [valueProfileId],
      related_narrative_node_ids: [],
    },
  });
  assert(memory.status === 201, 'memory creation should return 201');

  const updatedLesson = await app.handle({
    method: 'PATCH',
    path: `/data/lessons/${lessonId}`,
    headers: { authorization: `Bearer ${token}`, 'x-owner-id': ownerId },
    body: { linked_value_profile_ids: [valueProfileId] },
  });
  assert(updatedLesson.status === 200, 'lesson update should return 200');

  await grantExportConsent(app, ownerId, token);

  const jsonExport = await app.handle({
    method: 'POST',
    path: '/exports',
    headers: { authorization: `Bearer ${token}` },
    body: { owner_id: ownerId, format: 'json' },
  });
  assert(jsonExport.status === 201, 'json export should return 201');
  const jsonExportId = (jsonExport.body as { export_id: string }).export_id;

  const pdfExport = await app.handle({
    method: 'POST',
    path: '/exports',
    headers: { authorization: `Bearer ${token}` },
    body: { owner_id: ownerId, format: 'pdf' },
  });
  assert(pdfExport.status === 201, 'pdf export should return 201');
  const pdfExportId = (pdfExport.body as { export_id: string }).export_id;

  const jsonDownload = await app.handle({
    method: 'GET',
    path: `/exports/${jsonExportId}/download`,
    headers: { authorization: `Bearer ${token}`, 'x-owner-id': ownerId },
  });
  assert(jsonDownload.status === 200, 'json download should return 200');
  const jsonBody = jsonDownload.body as { mime_type: string; content_base64: string };
  assert(jsonBody.mime_type === 'application/json', 'json export should use application/json mime type');

  const payload = JSON.parse(Buffer.from(jsonBody.content_base64, 'base64').toString('utf8')) as {
    memories: Array<{ title: string }>;
  };
  assert(payload.memories.some((item) => item.title === 'Souvenir DoD'), 'json export should contain created memory');

  const pdfDownload = await app.handle({
    method: 'GET',
    path: `/exports/${pdfExportId}/download`,
    headers: { authorization: `Bearer ${token}`, 'x-owner-id': ownerId },
  });
  assert(pdfDownload.status === 200, 'pdf download should return 200');
  const pdfBody = pdfDownload.body as { mime_type: string; content_base64: string };
  assert(pdfBody.mime_type === 'application/pdf', 'pdf export should use application/pdf mime type');
  assert(pdfBody.content_base64.length > 0, 'pdf export should contain a payload');

  return 'Auth, création/édition des contenus, liaisons simples, export JSON/PDF validés.';
};

const runOwnerMismatchScenario = async (): Promise<string> => {
  const app = new CapsuleApiApp();
  const register = await app.handle({
    method: 'POST',
    path: '/auth/register',
    body: { email: 'dod-security-owner@example.com', password: 'Secret123!' },
    headers: { 'x-forwarded-for': '203.0.113.42' },
  });
  assert(register.status === 201, 'register should return 201 for owner mismatch');
  const body = register.body as { user: { id: string }; session: { token: string } };

  const denied = await app.handle({
    method: 'GET',
    path: '/data/memories',
    headers: { authorization: `Bearer ${body.session.token}`, 'x-owner-id': 'another-owner' },
  });
  assert(denied.status === 403, 'owner mismatch should return 403');

  return 'Owner mismatch interdit (403) sur route protégée.';
};

const runExpiredSessionScenario = async (): Promise<string> => {
  const app = new CapsuleApiApp();
  const register = await app.handle({
    method: 'POST',
    path: '/auth/register',
    body: { email: 'dod-security-expired@example.com', password: 'Secret123!' },
    headers: { 'x-forwarded-for': '203.0.113.43' },
  });
  assert(register.status === 201, 'register should return 201 for expired session scenario');
  const body = register.body as { user: { id: string }; session: { token: string } };

  const logout = await app.handle({
    method: 'POST',
    path: '/auth/logout',
    headers: { authorization: `Bearer ${body.session.token}`, 'x-forwarded-for': '203.0.113.43' },
  });
  assert(logout.status === 204, 'logout should return 204');

  const denied = await app.handle({
    method: 'GET',
    path: '/data/memories',
    headers: { authorization: `Bearer ${body.session.token}`, 'x-owner-id': body.user.id },
  });
  assert(denied.status === 401, 'revoked session token should return 401');

  return 'Session expirée/révoquée: accès ultérieur refusé (401).';
};

const runRateLimitScenario = async (): Promise<string> => {
  const oldLimit = runtimeEnv.CAPSULE_AUTH_RATE_LIMIT_MAX_ATTEMPTS;
  const oldWindow = runtimeEnv.CAPSULE_AUTH_RATE_LIMIT_WINDOW_MS;
  runtimeEnv.CAPSULE_AUTH_RATE_LIMIT_MAX_ATTEMPTS = '2';
  runtimeEnv.CAPSULE_AUTH_RATE_LIMIT_WINDOW_MS = '60000';

  try {
    const app = new CapsuleApiApp();
    const ip = '203.0.113.44';
    const first = await app.handle({
      method: 'POST',
      path: '/auth/login',
      body: { email: 'nobody@example.com', password: 'WrongPass1!' },
      headers: { 'x-forwarded-for': ip },
    });
    const second = await app.handle({
      method: 'POST',
      path: '/auth/login',
      body: { email: 'nobody@example.com', password: 'WrongPass1!' },
      headers: { 'x-forwarded-for': ip },
    });
    const third = await app.handle({
      method: 'POST',
      path: '/auth/login',
      body: { email: 'nobody@example.com', password: 'WrongPass1!' },
      headers: { 'x-forwarded-for': ip },
    });

    assert(first.status === 401, 'first auth attempt should fail with 401');
    assert(second.status === 401, 'second auth attempt should fail with 401');
    assert(third.status === 429, 'third auth attempt should be rate limited with 429');

    return 'Rate limiting auth actif: dépassement bloqué (429).';
  } finally {
    runtimeEnv.CAPSULE_AUTH_RATE_LIMIT_MAX_ATTEMPTS = oldLimit;
    runtimeEnv.CAPSULE_AUTH_RATE_LIMIT_WINDOW_MS = oldWindow;
  }
};

export const runDodE2EScenarios = async (): Promise<E2EScenarioResult[]> => {
  const results: E2EScenarioResult[] = [];

  results.push(await runScenario('DoD-CRIT-01', runCriticalPathScenario));
  results.push(await runScenario('SEC-OWNER-01', runOwnerMismatchScenario));
  results.push(await runScenario('SEC-SESSION-01', runExpiredSessionScenario));
  results.push(await runScenario('SEC-RATE-01', runRateLimitScenario));

  return results;
};
