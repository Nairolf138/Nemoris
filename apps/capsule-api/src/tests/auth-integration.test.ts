import { CapsuleApiApp } from '../app.js';

const assert = (condition: unknown, message: string): void => {
  if (!condition) {
    throw new Error(message);
  }
};

export const runAuthIntegrationTests = async (): Promise<void> => {
  const app = new CapsuleApiApp();

  const register = await app.handle({
    method: 'POST',
    path: '/auth/register',
    body: { email: 'charlie@example.com', password: 'secret123' },
  });
  assert(register.status === 201, 'register should return 201');
  const registerToken = (register.body as { session: { token: string } }).session.token;

  const dataOk = await app.handle({
    method: 'GET',
    path: '/data/memories',
    headers: { authorization: `Bearer ${registerToken}` },
  });
  assert(dataOk.status === 200, 'authenticated data route should pass');

  const logout = await app.handle({
    method: 'POST',
    path: '/auth/logout',
    headers: { authorization: `Bearer ${registerToken}` },
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
    body: { email: 'dana@example.com', password: 'secret123' },
  });

  const loginFail = await app.handle({
    method: 'POST',
    path: '/auth/login',
    body: { email: 'dana@example.com', password: 'bad-password' },
  });
  assert(loginFail.status === 401, 'login with bad credentials should fail');

  const loginOk = await app.handle({
    method: 'POST',
    path: '/auth/login',
    body: { email: 'dana@example.com', password: 'secret123' },
  });
  assert(loginOk.status === 200, 'login with valid credentials should pass');
};
