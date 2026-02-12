import { CapsuleApiApp } from '../app.js';

const assert = (condition: unknown, message: string): void => {
  if (!condition) {
    throw new Error(message);
  }
};

export const runExportIntegrationTests = async (): Promise<void> => {
  const app = new CapsuleApiApp();

  const register = await app.handle({
    method: 'POST',
    path: '/auth/register',
    body: { email: 'exporter@example.com', password: 'secret123' },
    headers: { 'x-forwarded-for': '203.0.113.3' },
  });

  const token = (register.body as { session: { token: string } }).session.token;
  const ownerId = (register.body as { user: { id: string } }).user.id;

  const denied = await app.handle({ method: 'POST', path: '/exports', body: { format: 'json', owner_id: ownerId } });
  assert(denied.status === 401, 'exports endpoint should require auth');

  const created = await app.handle({
    method: 'POST',
    path: '/exports',
    headers: { authorization: `Bearer ${token}` },
    body: { format: 'pdf', owner_id: ownerId },
  });

  assert(created.status === 201, 'export creation should return 201');
  const exportId = (created.body as { export_id: string }).export_id;

  const downloaded = await app.handle({
    method: 'GET',
    path: `/exports/${exportId}/download`,
    headers: { authorization: `Bearer ${token}`, 'x-owner-id': ownerId },
  });

  assert(downloaded.status === 200, 'download should return 200');
  const payload = downloaded.body as { mime_type: string; content_base64: string };
  assert(payload.mime_type === 'application/pdf', 'download should be a PDF');
  assert(payload.content_base64.length > 0, 'download should contain payload');

  const audit = await app.handle({
    method: 'GET',
    path: '/exports/audit',
    headers: { authorization: `Bearer ${token}`, 'x-owner-id': ownerId },
  });

  assert(audit.status === 200, 'audit route should return 200');
  const entries = (audit.body as { entries: Array<{ format: string }> }).entries;
  assert(entries.length === 1, 'audit should contain one entry');
  assert(entries[0]?.format === 'pdf', 'audit should keep the format');

  const observabilityAudit = await app.handle({
    method: 'GET',
    path: '/observability/audit',
    headers: { authorization: `Bearer ${token}`, 'x-owner-id': ownerId },
  });
  assert(observabilityAudit.status === 200, 'observability audit endpoint should return 200');

  const obsEntries = (observabilityAudit.body as { entries: Array<{ event_name: string }> }).entries;
  assert(obsEntries.some((entry) => entry.event_name === 'export.created'), 'export created event should be emitted');
  assert(obsEntries.some((entry) => entry.event_name === 'export.downloaded'), 'export downloaded event should be emitted');

  const dashboard = await app.handle({
    method: 'GET',
    path: '/observability/dashboard',
    headers: { authorization: `Bearer ${token}`, 'x-owner-id': ownerId },
  });

  assert(dashboard.status === 200, 'dashboard endpoint should return 200');
  const body = dashboard.body as { json: { metrics: { exports: number } }; csv: string };
  assert(body.json.metrics.exports >= 1, 'dashboard should expose export metric');
  assert(body.csv.includes('exports,'), 'dashboard csv should include exports metric');
};
