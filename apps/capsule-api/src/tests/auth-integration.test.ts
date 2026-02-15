import { CapsuleApiApp } from '../app.js';

const assert = (condition: unknown, message: string): void => {
  if (!condition) {
    throw new Error(message);
  }
};

const registerUser = async (app: CapsuleApiApp, email: string, clientIp: string) =>
  app.handle({
    method: 'POST',
    path: '/auth/register',
    body: { email, password: 'Secret123!' },
    headers: { 'x-forwarded-for': clientIp },
  });

export const runAuthIntegrationTests = async (): Promise<void> => {
  const app = new CapsuleApiApp();

  const invalidEmail = await app.handle({
    method: 'POST',
    path: '/auth/register',
    body: { email: 'invalid-email', password: 'Secret123!' },
    headers: { 'x-forwarded-for': '203.0.113.1' },
  });
  assert(invalidEmail.status === 400, 'invalid email should be rejected');
  assert((invalidEmail.body as { error: string }).error === 'INVALID_EMAIL', 'invalid email should expose INVALID_EMAIL');

  const weakPassword = await app.handle({
    method: 'POST',
    path: '/auth/register',
    body: { email: 'weak@example.com', password: 'weakpass' },
    headers: { 'x-forwarded-for': '203.0.113.1' },
  });
  assert(weakPassword.status === 400, 'weak passwords should be rejected');
  assert((weakPassword.body as { error: string }).error === 'WEAK_PASSWORD', 'weak password should expose WEAK_PASSWORD');

  const register = await registerUser(app, '  CHARLIE@EXAMPLE.COM ', '203.0.113.1');
  assert(register.status === 201, 'register should return 201');
  assert((register.body as { user: { email: string } }).user.email === 'charlie@example.com', 'email should be normalized');
  const registerBody = register.body as { user: { id: string }; session: { token: string } };
  const registerToken = registerBody.session.token;

  const logoutWithoutToken = await app.handle({
    method: 'POST',
    path: '/auth/logout',
    headers: { 'x-forwarded-for': '203.0.113.1' },
  });
  assert(logoutWithoutToken.status === 401, 'logout without token should be rejected');

  const dataOk = await app.handle({
    method: 'GET',
    path: '/data/memories',
    headers: { authorization: `Bearer ${registerToken}`, 'x-owner-id': registerBody.user.id },
  });
  assert(dataOk.status === 200, 'authenticated data route should pass');

  const deniedOwner = await app.handle({
    method: 'GET',
    path: '/data/memories',
    headers: { authorization: `Bearer ${registerToken}`, 'x-owner-id': 'another-owner' },
  });
  assert(deniedOwner.status === 403, 'owner mismatch must be forbidden');

  const invalidOwnerScope = await app.handle({
    method: 'GET',
    path: '/data/memories',
    headers: { authorization: `Bearer ${registerToken}`, 'x-owner-id': '   ' },
  });
  assert(invalidOwnerScope.status === 400, 'invalid owner scope should be rejected');
  assert(
    (invalidOwnerScope.body as { error: string }).error === 'INVALID_OWNER_SCOPE',
    'invalid owner scope should expose INVALID_OWNER_SCOPE',
  );

  const logout = await app.handle({
    method: 'POST',
    path: '/auth/logout',
    headers: { authorization: `Bearer ${registerToken}`, 'x-forwarded-for': '203.0.113.1' },
  });
  assert(logout.status === 204, 'logout should return 204');

  const dataDeniedAfterLogout = await app.handle({
    method: 'GET',
    path: '/data/memories',
    headers: { authorization: `Bearer ${registerToken}`, 'x-owner-id': registerBody.user.id },
  });
  assert(dataDeniedAfterLogout.status === 401, 'revoked session should not access data');

  const invalidSession = await app.handle({
    method: 'GET',
    path: '/data/memories',
    headers: { authorization: 'Bearer malformed.session.token', 'x-owner-id': registerBody.user.id },
  });
  assert(invalidSession.status === 401, 'invalid session tokens should be rejected on protected routes');

  const danaRegister = await registerUser(app, 'dana@example.com', '203.0.113.2');
  assert(danaRegister.status === 201, 'second user registration should pass');
  const danaUserId = (danaRegister.body as { user: { id: string } }).user.id;

  const loginFail = await app.handle({
    method: 'POST',
    path: '/auth/login',
    body: { email: 'dana@example.com', password: 'WrongPass1!' },
    headers: { 'x-forwarded-for': '203.0.113.2' },
  });
  assert(loginFail.status === 401, 'login with bad credentials should fail');

  await app.handle({
    method: 'POST',
    path: '/auth/login',
    body: { email: 'dana@example.com', password: 'WrongPass1!' },
    headers: { 'x-forwarded-for': '203.0.113.2' },
  });
  await app.handle({
    method: 'POST',
    path: '/auth/login',
    body: { email: 'dana@example.com', password: 'WrongPass1!' },
    headers: { 'x-forwarded-for': '203.0.113.2' },
  });
  const blocked = await app.handle({
    method: 'POST',
    path: '/auth/login',
    body: { email: 'dana@example.com', password: 'WrongPass1!' },
    headers: { 'x-forwarded-for': '203.0.113.2' },
  });
  assert(blocked.status === 429, 'repeated failed logins should be blocked');

  const loginOk = await app.handle({
    method: 'POST',
    path: '/auth/login',
    body: { email: 'dana@example.com', password: 'Secret123!' },
    headers: { 'x-forwarded-for': '198.51.100.8' },
  });
  assert(loginOk.status === 200, 'login with valid credentials should pass');
  const loginBody = loginOk.body as { user: { id: string }; session: { token: string } };
  const token = loginBody.session.token;

  const observabilityAudit = await app.handle({
    method: 'GET',
    path: '/observability/audit',
    headers: { authorization: `Bearer ${token}`, 'x-owner-id': loginBody.user.id },
  });
  const entries = (observabilityAudit.body as { entries: Array<{ event_name: string }> }).entries;

  assert(entries.some((entry) => entry.event_name === 'onboarding.completed'), 'register should emit onboarding event');
  assert(entries.some((entry) => entry.event_name === 'audit.capsule.created'), 'register should emit capsule creation audit event');
  assert(entries.some((entry) => entry.event_name === 'auth.login'), 'login should emit auth.login event');
  assert(entries.some((entry) => entry.event_name === 'auth.logout'), 'logout should emit auth.logout event');
  assert(entries.some((entry) => entry.event_name === 'security.alert.triggered'), 'repeated anomalies should trigger alert');

  const concurrentRegisterResults = await Promise.all(
    Array.from({ length: 4 }, (_, index) =>
      app.handle({
        method: 'POST',
        path: '/auth/register',
        body: { email: `batch-user-${index}@example.com`, password: 'Secret123!' },
        headers: { 'x-forwarded-for': `203.0.113.${10 + index}` },
      }),
    ),
  );
  assert(
    concurrentRegisterResults.every((result) => result.status === 201),
    'concurrent register attempts should all succeed',
  );

  const concurrentLoginResults = await Promise.all(
    Array.from({ length: 4 }, (_, index) =>
      app.handle({
        method: 'POST',
        path: '/auth/login',
        body: { email: `batch-user-${index}@example.com`, password: 'Secret123!' },
        headers: { 'x-forwarded-for': `198.51.100.${20 + index}` },
      }),
    ),
  );
  assert(concurrentLoginResults.every((result) => result.status === 200), 'concurrent login attempts should all succeed');

  const batchLoginBody = concurrentLoginResults[0]?.body as { user: { id: string }; session: { token: string } };
  const sessionToken = batchLoginBody.session.token;
  const refreshed = await app.handle({
    method: 'POST',
    path: '/auth/refresh',
    headers: { authorization: `Bearer ${sessionToken}`, 'x-forwarded-for': '198.51.100.30' },
  });
  assert(refreshed.status === 200, 'refresh should issue a new session');
  const refreshedToken = (refreshed.body as { session: { token: string } }).session.token;

  const oldTokenAfterRefresh = await app.handle({
    method: 'GET',
    path: '/data/memories',
    headers: { authorization: `Bearer ${sessionToken}`, 'x-owner-id': batchLoginBody.user.id },
  });
  assert(oldTokenAfterRefresh.status === 401, 'refresh should revoke previous session token');

  const revokeRefreshed = await app.handle({
    method: 'POST',
    path: '/auth/logout',
    headers: { authorization: `Bearer ${refreshedToken}`, 'x-forwarded-for': '198.51.100.30' },
  });
  assert(revokeRefreshed.status === 204, 'logout should revoke refreshed session');

  const refreshedAfterRevoke = await app.handle({
    method: 'GET',
    path: '/data/memories',
    headers: { authorization: `Bearer ${refreshedToken}`, 'x-owner-id': batchLoginBody.user.id },
  });
  assert(refreshedAfterRevoke.status === 401, 'revoked refreshed token should not authenticate');

  const protectedRouteOwnerMismatchScenarios: Array<{ method: 'GET' | 'POST'; path: string; body?: Record<string, unknown> }> = [
    { method: 'GET', path: '/data/memories' },
    { method: 'GET', path: '/consent/history' },
    { method: 'POST', path: '/consent/grant', body: { scope: 'data_export', legal_basis: 'consent' } },
    { method: 'POST', path: '/consent/revoke', body: { scope: 'data_export', legal_basis: 'consent' } },
    { method: 'GET', path: '/exports/audit' },
    { method: 'POST', path: '/exports', body: { format: 'json' } },
  ];

  for (const scenario of protectedRouteOwnerMismatchScenarios) {
    const response = await app.handle({
      method: scenario.method,
      path: scenario.path,
      body: {
        ...(scenario.body ?? {}),
        owner_id: registerBody.user.id,
      },
      headers: {
        authorization: `Bearer ${token}`,
        'x-owner-id': registerBody.user.id,
      },
    });
    assert(
      response.status === 403,
      `route ${scenario.method} ${scenario.path} should enforce owner isolation when owner scope mismatches token owner`,
    );
  }


  const ownerRelogin = await app.handle({
    method: 'POST',
    path: '/auth/login',
    body: { email: 'charlie@example.com', password: 'Secret123!' },
    headers: { 'x-forwarded-for': '198.51.100.44' },
  });
  assert(ownerRelogin.status === 200, 'owner should be able to log back in after logout');
  const ownerToken = (ownerRelogin.body as { session: { token: string } }).session.token;

  const ownerBeneficiary = await app.handle({
    method: 'POST',
    path: '/data/beneficiaries',
    headers: { authorization: `Bearer ${ownerToken}`, 'x-owner-id': registerBody.user.id },
    body: {
      visibility: 'private',
      identity: 'Owner beneficiary',
      channel: 'email',
      contact: 'owner-beneficiary@example.com',
      verification_status: 'verified',
      status: 'active',
    },
  });
  assert(ownerBeneficiary.status === 201, 'beneficiary creation for owner should succeed');
  const ownerBeneficiaryId = (ownerBeneficiary.body as { id: string }).id;

  const ownerLegacyMessage = await app.handle({
    method: 'POST',
    path: '/data/legacy_messages',
    headers: { authorization: `Bearer ${ownerToken}`, 'x-owner-id': registerBody.user.id },
    body: {
      visibility: 'private',
      title: 'Private legacy message',
      message: 'Confidential content',
      trigger_type: 'manual',
      beneficiary_ids: [ownerBeneficiaryId],
      attachment_memory_ids: [],
      related_belief_ids: [],
      related_lesson_ids: [],
      related_value_profile_ids: [],
      related_narrative_node_ids: [],
      state: 'draft',
    },
  });
  assert(ownerLegacyMessage.status === 201, 'legacy message creation for owner should succeed');
  const ownerLegacyMessageId = (ownerLegacyMessage.body as { id: string }).id;

  const outsiderLegacyAction = await app.handle({
    method: 'POST',
    path: `/legacy-messages/${ownerLegacyMessageId}/arm`,
    headers: {
      authorization: `Bearer ${token}`,
      'x-owner-id': registerBody.user.id,
    },
    body: { reason: 'malicious attempt' },
  });
  assert(outsiderLegacyAction.status === 403, 'legacy message orchestration route should enforce owner isolation');

  const ownerProtectedWithoutToken = await app.handle({
    method: 'GET',
    path: '/data/memories',
    headers: { 'x-owner-id': danaUserId },
  });
  assert(ownerProtectedWithoutToken.status === 401, 'protected route should reject missing token');
};
