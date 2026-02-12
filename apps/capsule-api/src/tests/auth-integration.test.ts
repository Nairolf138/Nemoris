import { CapsuleApiApp } from '../app.js';

const assert = (condition: unknown, message: string): void => {
  if (!condition) {
    throw new Error(message);
  }
};

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

  const register = await app.handle({
    method: 'POST',
    path: '/auth/register',
    body: { email: '  CHARLIE@EXAMPLE.COM ', password: 'Secret123!' },
    headers: { 'x-forwarded-for': '203.0.113.1' },
  });
  assert(register.status === 201, 'register should return 201');
  assert((register.body as { user: { email: string } }).user.email === 'charlie@example.com', 'email should be normalized');
  const registerToken = (register.body as { session: { token: string } }).session.token;

  const dataOk = await app.handle({
    method: 'GET',
    path: '/data/memories',
    headers: { authorization: `Bearer ${registerToken}`, 'x-owner-id': (register.body as { user: { id: string } }).user.id },
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

  const dataDenied = await app.handle({
    method: 'GET',
    path: '/data/memories',
    headers: { authorization: `Bearer ${registerToken}` },
  });
  assert(dataDenied.status === 401, 'revoked session should not access data');

  await app.handle({
    method: 'POST',
    path: '/auth/register',
    body: { email: 'dana@example.com', password: 'Secret123!' },
    headers: { 'x-forwarded-for': '203.0.113.2' },
  });

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
  const token = (loginOk.body as { session: { token: string } }).session.token;

  const observabilityAudit = await app.handle({
    method: 'GET',
    path: '/observability/audit',
    headers: { authorization: `Bearer ${token}`, 'x-owner-id': (loginOk.body as { user: { id: string } }).user.id },
  });
  const entries = (observabilityAudit.body as { entries: Array<{ event_name: string }> }).entries;

  assert(entries.some((entry) => entry.event_name === 'onboarding.completed'), 'register should emit onboarding event');
  assert(entries.some((entry) => entry.event_name === 'auth.login'), 'login should emit auth.login event');
  assert(entries.some((entry) => entry.event_name === 'auth.logout'), 'logout should emit auth.logout event');
  assert(entries.some((entry) => entry.event_name === 'security.alert.triggered'), 'repeated anomalies should trigger alert');
};
