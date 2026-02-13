import { AuthService } from '../auth-service.js';
import { hashPassword, verifyPassword } from '../security.js';
import { InMemoryAuthStore } from '../store.js';

const assert = (condition: unknown, message: string): void => {
  if (!condition) {
    throw new Error(message);
  }
};

export const runAuthServiceTests = async (): Promise<void> => {
  const password = 'Tr0ub4dor&3';
  const hash = await hashPassword(password);
  assert(hash !== password, 'password must be hashed');
  assert((await verifyPassword(password, hash)) === true, 'valid password should verify');
  assert((await verifyPassword('wrong-password', hash)) === false, 'invalid password should fail');

  const service = new AuthService();
  const auth = await service.register('alice@example.com', 'Secret123!');
  const rotated = await service.refresh(auth.session.token);

  assert(rotated.token !== auth.session.token, 'refresh should rotate token');
  let oldTokenRejected = false;
  try {
    await service.authenticate(auth.session.token);
  } catch {
    oldTokenRejected = true;
  }
  assert(oldTokenRejected, 'previous token should be invalidated after refresh');

  const authLogout = await service.register('bob@example.com', 'Secret123!');
  await service.logout(authLogout.session.token);
  let revokedRejected = false;
  try {
    await service.authenticate(authLogout.session.token);
  } catch {
    revokedRejected = true;
  }
  assert(revokedRejected, 'logout should revoke session');

  const expiringStore = new InMemoryAuthStore();
  const serviceWithExpiredSession = new AuthService(expiringStore);
  const authWithExpiringSession = await serviceWithExpiredSession.register('eve@example.com', 'Secret123!');
  expiringStore.saveSession({
    ...authWithExpiringSession.session,
    expires_at: new Date(Date.now() - 60_000).toISOString(),
  });

  let expiredRejected = false;
  try {
    await serviceWithExpiredSession.authenticate(authWithExpiringSession.session.token);
  } catch {
    expiredRejected = true;
  }
  assert(expiredRejected, 'expired sessions should not authenticate');
};
