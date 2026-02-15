import { CapsuleApiApp } from '../app.js';

const assert = (condition: unknown, message: string): void => {
  if (!condition) {
    throw new Error(message);
  }
};

const registerAndLogin = async (app: CapsuleApiApp) => {
  const email = `vault-${Date.now()}@example.com`;
  const password = 'VaultPass1!';
  const register = await app.handle({
    method: 'POST',
    path: '/auth/register',
    headers: { 'x-forwarded-for': '198.51.100.44' },
    body: { email, password },
  });
  assert(register.status === 201, 'register should succeed');
  const body = register.body as { user: { id: string }; session: { token: string } };
  return { userId: body.user.id, token: body.session.token };
};

const grantConsent = async (app: CapsuleApiApp, owner: { userId: string; token: string }, scope: 'posthumous_visibility' | 'data_export') => {
  const response = await app.handle({
    method: 'POST',
    path: '/consent/grant',
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
    body: {
      owner_id: owner.userId,
      scope,
      legal_basis: 'vault-test',
    },
  });
  assert(response.status === 201, `consent ${scope} should be granted`);
};

export const runVaultIntegrationTests = async (): Promise<void> => {
  const app = new CapsuleApiApp();
  const owner = await registerAndLogin(app);
  const content = 'ZG9jdW1lbnQgZXNzZW50aWVs';

  const upload = await app.handle({
    method: 'POST',
    path: '/vault/documents/upload',
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
    body: {
      owner_id: owner.userId,
      filename: 'test-document.pdf',
      mime: 'application/pdf',
      visibility: 'private',
      content_base64: content,
    },
  });
  assert(upload.status === 201, 'vault upload should return 201');
  const uploaded = upload.body as { id: string; size: number };
  assert(uploaded.size > 0, 'uploaded file should expose a size');

  const list = await app.handle({
    method: 'GET',
    path: `/vault/documents?owner_id=${owner.userId}`,
    headers: { authorization: `Bearer ${owner.token}` },
  });
  assert(list.status === 200, 'vault listing should return 200');
  const listBody = list.body as { items: Array<{ id: string }>; quota: { max_mb: number } };
  assert(listBody.items.some((item) => item.id === uploaded.id), 'listing should include uploaded document');
  assert(listBody.quota.max_mb >= 50 && listBody.quota.max_mb <= 500, 'quota max_mb should be clamped in allowed range');

  const dataExportWithoutConsent = await app.handle({
    method: 'GET',
    path: `/vault/documents/${uploaded.id}/download?owner_id=${owner.userId}&purpose=data_export`,
    headers: { authorization: `Bearer ${owner.token}` },
  });
  assert(dataExportWithoutConsent.status === 403, 'data export download should be forbidden without consent');

  await grantConsent(app, owner, 'data_export');

  const download = await app.handle({
    method: 'GET',
    path: `/vault/documents/${uploaded.id}/download?owner_id=${owner.userId}&purpose=data_export`,
    headers: { authorization: `Bearer ${owner.token}` },
  });
  assert(download.status === 200, 'vault download should return 200 after consent');

  const unsupportedMime = await app.handle({
    method: 'POST',
    path: '/vault/documents/upload',
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
    body: {
      owner_id: owner.userId,
      filename: 'script.sh',
      mime: 'application/x-sh',
      visibility: 'private',
      content_base64: content,
    },
  });
  assert(unsupportedMime.status === 400, 'unsupported mime should be rejected');

  const posthumousWithoutConsent = await app.handle({
    method: 'POST',
    path: '/vault/documents/upload',
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
    body: {
      owner_id: owner.userId,
      filename: 'posthumous.pdf',
      mime: 'application/pdf',
      visibility: 'posthumous',
      content_base64: content,
    },
  });
  assert(posthumousWithoutConsent.status === 403, 'posthumous upload should require consent');

  await grantConsent(app, owner, 'posthumous_visibility');

  const posthumousWithConsent = await app.handle({
    method: 'POST',
    path: '/vault/documents/upload',
    headers: { authorization: `Bearer ${owner.token}`, 'x-owner-id': owner.userId },
    body: {
      owner_id: owner.userId,
      filename: 'posthumous-approved.pdf',
      mime: 'application/pdf',
      visibility: 'posthumous',
      content_base64: content,
    },
  });
  assert(posthumousWithConsent.status === 201, 'posthumous upload should work after consent');


  const freeOwner = await registerAndLogin(app);
  const freeUpload = await app.handle({
    method: 'POST',
    path: '/vault/documents/upload',
    headers: { authorization: `Bearer ${freeOwner.token}`, 'x-owner-id': freeOwner.userId, 'x-capsule-plan': 'free' },
    body: {
      owner_id: freeOwner.userId,
      filename: 'free-document.pdf',
      mime: 'application/pdf',
      visibility: 'private',
      content_base64: content,
    },
  });
  assert(freeUpload.status === 400, 'free tier should not allow internal vault upload');

};
