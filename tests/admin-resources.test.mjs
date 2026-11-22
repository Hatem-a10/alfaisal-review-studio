import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { resourceAdmin, resourceStudent } from '../lib/admin-resources.mjs';

function mockEnv({ duplicate = null, active = null } = {}) {
  const log = { prepared: [], writes: [], gets: [], puts: [], lists: [] };
  const DB = {
    prepare(sql) {
      return {
        sql,
        values: [],
        bind(...values) { this.values = values; return this; },
        async first() {
          log.prepared.push([sql, this.values]);
          if (sql.includes('FROM admin_shared_resources WHERE sha256')) return duplicate;
          if (sql.includes("WHERE id=? AND status='active'") || sql.includes("WHERE id = ? AND status = 'active'")) return active;
          if (sql.includes('COUNT(*) AS files') && sql.includes('study_materials')) return { files: 3, bytes: 400 };
          if (sql.includes('COUNT(*) AS records') && sql.includes('study_snapshots')) return { records: 7, logicalBytes: 1200 };
          if (sql.includes('SUM(count)') && sql.includes('control_daily')) return { count: 2 };
          if (sql.includes('COUNT(*) AS total')) return { total: 0 };
          return null;
        },
        async all() {
          log.prepared.push([sql, this.values]);
          return { results: [] };
        },
      };
    },
  };
  const BUCKET = {
    async put(key, body, options) { log.puts.push({ key, body, options }); },
    async head(key) { return key.includes('missing') ? null : { size: 10 }; },
    async get(key) { log.gets.push(key); return key.includes('missing') ? null : { body: new Blob(['ok']).stream() }; },
    async list({ prefix }) { log.lists.push(prefix); return { objects: [], truncated: false }; },
  };
  return { env: { DB, BUCKET, ENVIRONMENT: 'staging' }, log };
}

async function uploadRequest({ name = 'resource.pdf', type = 'application/pdf', contents = '%PDF-1.7\nmock pdf', fields = {}, includeLength = true } = {}) {
  const form = new FormData();
  form.append('file', new File([contents], name, { type }));
  for (const [key, value] of Object.entries({ title: 'Test resource', course: 'CVP', lectureId: 'CVP-A1', topic: 'Thorax', ...fields })) form.append(key, value);
  const request = new Request('https://staging.example/api/control-center/admin/resources', { method: 'POST', body: form, headers: { origin: 'https://staging.example' } });
  const body = await request.arrayBuffer();
  const headers = { 'content-type': request.headers.get('content-type'), origin: 'https://staging.example' };
  if (includeLength) headers['content-length'] = String(body.byteLength);
  return new Request(request.url, { method: 'POST', body, headers });
}

test('resource and storage permissions fail closed by server role', async () => {
  const { env } = mockEnv();
  const req = new Request('https://staging.example/api/admin/resources');
  assert.equal((await resourceAdmin({ request: req, env, user: 'student-1', role: 'student', section: 'resources', action: 'list' })).status, 403);
  assert.equal((await resourceAdmin({ request: req, env, user: 'editor-1', role: 'editor', section: 'storage', action: 'summary' })).status, 403);
  assert.equal((await resourceAdmin({ request: req, env, user: 'editor-1', role: 'editor', section: 'resources', action: 'list' })).status, 200);
});

test('uploads require real file signatures, supported types, and an approved course', async () => {
  const { env } = mockEnv();
  const invalidSignature = await resourceAdmin({ request: await uploadRequest({ contents: 'not a PDF' }), env, user: 'editor-1', role: 'editor', section: 'resources', action: 'upload', mutate: async () => {} });
  assert.equal(invalidSignature.status, 400);
  const invalidCategory = await resourceAdmin({ request: await uploadRequest({ fields: { course: 'PRIVATE' } }), env, user: 'editor-1', role: 'editor', section: 'resources', action: 'upload', mutate: async () => {} });
  assert.equal(invalidCategory.status, 400);
  assert.equal(env.BUCKET.put ? 0 : 1, 0, 'bucket binding exists');
});

test('valid PDF upload creates an immutable shared object and sends catalog writes through the audited mutation service', async () => {
  const { env, log } = mockEnv();
  let call;
  const response = await resourceAdmin({
    request: await uploadRequest(), env, user: 'editor-1', role: 'editor', section: 'resources', action: 'upload',
    mutate: async (statements, action, target) => { call = { statements, action, target }; },
  });
  assert.equal(response.status, 201);
  const payload = await response.json();
  assert.equal(payload.resource.status, 'active');
  assert.equal(payload.resource.course, 'CVP');
  assert.match(payload.resource.sha256, /^[a-f0-9]{64}$/);
  assert.equal(log.puts.length, 1);
  assert.match(log.puts[0].key, /^admin\/shared\/[0-9a-f-]{36}\/resource\.pdf$/i);
  assert.equal(log.puts[0].options.customMetadata.visibility, 'shared');
  assert.equal(call.action, 'shared_resource.upload');
  assert.equal(call.target, payload.resource.id);
  assert.equal(call.statements.length, 1);
});

test('MIME type comes from file signature and Unicode filenames retain UTF-8 disposition', async () => {
  const { env, log } = mockEnv();
  const response = await resourceAdmin({ request: await uploadRequest({ name: 'محاضرة.pdf', type: 'text/plain' }), env, user: 'editor', role: 'editor', section: 'resources', action: 'upload', mutate: async () => {} });
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.resource.mime, 'application/pdf');
  assert.match(log.puts[0].options.httpMetadata.contentDisposition, /filename\*=UTF-8''%D9%85/);
});

test('active SHA-256 uniqueness is enforced in D1 to close concurrent upload races', () => {
  const schema = fs.readFileSync(new URL('../staging/admin-resources.sql', import.meta.url), 'utf8');
  assert.match(schema, /CREATE UNIQUE INDEX IF NOT EXISTS admin_shared_resources_one_active_sha[\s\S]*?ON admin_shared_resources\(sha256\) WHERE status = 'active'/);
});

test('a catalog race leaves a visible orphan candidate and never deletes the R2 object', async () => {
  const { env, log } = mockEnv();
  let lookups = 0;
  const originalPrepare = env.DB.prepare.bind(env.DB);
  env.DB.prepare = (sql) => {
    const statement = originalPrepare(sql);
    if (sql.includes('FROM admin_shared_resources WHERE sha256')) statement.first = async () => ++lookups === 1 ? null : { id: 'racing-item', title: 'Other upload', status: 'active' };
    return statement;
  };
  const response = await resourceAdmin({ request: await uploadRequest(), env, user: 'editor', role: 'editor', section: 'resources', action: 'upload', mutate: async () => { throw new Error('unique index conflict'); } });
  assert.equal(response.status, 409);
  assert.equal((await response.json()).orphanCandidate, true);
  assert.equal(log.puts.length, 1);
  assert.equal(typeof env.BUCKET.delete, 'undefined');
});

test('multipart upload accepts missing Content-Length but enforces its own stream cap', async () => {
  const { env, log } = mockEnv();
  const response = await resourceAdmin({ request: await uploadRequest({ includeLength: false }), env, user: 'editor-1', role: 'editor', section: 'resources', action: 'upload', mutate: async () => {} });
  assert.equal(response.status, 201);
  assert.equal(log.puts.length, 1);
  const chunks = Array.from({ length: 14 }, () => new Uint8Array(2 * 1024 * 1024));
  const oversizedBody = new ReadableStream({ start(controller) { chunks.forEach((chunk) => controller.enqueue(chunk)); controller.close(); } });
  const oversized = new Request('https://staging.example/api/control-center/admin/resources', { method: 'POST', body: oversizedBody, duplex: 'half', headers: { 'content-type': 'multipart/form-data; boundary=unused', origin: 'https://staging.example' } });
  const rejected = await resourceAdmin({ request: oversized, env, user: 'editor-1', role: 'editor', section: 'resources', action: 'upload', mutate: async () => {} });
  assert.equal(rejected.status, 413);
});

test('replacement accepts multipart resource ID and requires one; unchanged bytes are a no-op', async () => {
  const id = '11111111-1111-4111-8111-111111111111';
  const digest = createHash('sha256').update('%PDF-1.7\nmock pdf').digest('hex');
  const previous = { id, title: 'Same', status: 'active', sha256: digest };
  const { env, log } = mockEnv({ active: previous, duplicate: { ...previous } });
  const missing = await resourceAdmin({ request: await uploadRequest(), env, user: 'owner', role: 'owner', section: 'resources', action: 'replace', mutate: async () => {} });
  assert.equal(missing.status, 400);
  const unchanged = await resourceAdmin({ request: await uploadRequest({ fields: { id } }), env, user: 'owner', role: 'owner', section: 'resources', action: 'replace', mutate: async () => assert.fail('same content is a no-op') });
  assert.equal((await unchanged.json()).unchanged, true);
  assert.equal(log.puts.length, 0);
  const replacementEnv = mockEnv({ active: previous });
  const replaced = await resourceAdmin({ request: await uploadRequest({ fields: { id }, contents: '%PDF-2.0\nreplacement' }), env: replacementEnv.env, user: 'owner', role: 'owner', section: 'resources', action: 'replace', mutate: async (statements, action) => { assert.equal(action, 'shared_resource.replace'); assert.equal(statements.length, 3); } });
  assert.equal(replaced.status, 200);
  assert.equal(replacementEnv.log.puts.length, 1);
});

test('duplicate active content is rejected before creating another shared object', async () => {
  const { env, log } = mockEnv({ duplicate: { id: 'existing-id', title: 'Existing', status: 'active' } });
  const response = await resourceAdmin({ request: await uploadRequest(), env, user: 'editor-1', role: 'editor', section: 'resources', action: 'upload', mutate: async () => assert.fail('must not mutate') });
  assert.equal(response.status, 409);
  assert.equal(log.puts.length, 0);
});

test('student library exposes active shared items and streams only an active catalog object', async () => {
  const { env, log } = mockEnv();
  const path = '/api/control-center/student/resources';
  const response = await resourceStudent({ request: new Request(`https://staging.example${path}`), env, user: { id: 'student-1' }, path });
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).resources, []);
  assert.ok(log.prepared.every(([sql]) => sql.includes('admin_shared_resources') && !sql.includes('study_materials')), 'student endpoint queries only the public shared catalog');
  const download = await resourceStudent({ request: new Request(`https://staging.example${path}/11111111-1111-4111-8111-111111111111/download`), env, user: { id: 'student-1' }, path: `${path}/11111111-1111-4111-8111-111111111111/download` });
  assert.equal(download.status, 404, 'unlisted/private object is not returned');
  assert.equal(log.gets.length, 0);
  const unauthenticated = await resourceStudent({ request: new Request(`https://staging.example${path}`), env, path });
  assert.equal(unauthenticated.status, 401);
});

test('storage summary scopes R2 listing to shared academic resources and reports unconfigured backups honestly', async () => {
  const { env, log } = mockEnv();
  const response = await resourceAdmin({ request: new Request('https://staging.example/api/admin/storage'), env, user: 'owner-1', role: 'owner', section: 'storage', action: 'summary' });
  assert.equal(response.status, 200);
  const value = await response.json();
  assert.equal(value.environment, 'staging');
  assert.deepEqual(log.lists, ['admin/shared/']);
  assert.equal(value.personalStudentStorage.files, 3);
  assert.equal(value.personalStudentStorage.bytes, 400);
  assert.equal(value.progressDatabase.records, 7);
  assert.equal(value.progressDatabase.logicalBytes, 1200);
  assert.equal(value.uploads.failed, 2);
  assert.equal(value.uploads.windowDays, 30);
  assert.equal(value.backups.status, 'not_configured');
});

test('storage summary selects the explicitly configured production environment', async () => {
  const { env } = mockEnv();
  env.ENVIRONMENT = 'production';
  const response = await resourceAdmin({ request: new Request('https://production.example/api/admin/storage'), env, user: 'owner', role: 'owner', section: 'storage', action: 'summary' });
  const value = await response.json();
  assert.equal(value.environment, 'production');
  assert.ok(value.backups);
});

test('archive and integrity operations retain R2 objects and return broken-link status', async () => {
  const item = { id: '11111111-1111-4111-8111-111111111111', title: 'Stored', filename: 'stored.pdf', mime: 'application/pdf', resourceType: 'pdf', bytes: 10, sha256: 'a'.repeat(64), course: 'CVP', lectureId: 'CVP-A1', topic: '', status: 'active', uploadedBy: 'editor', uploadedAt: '2026-01-01', updatedAt: '2026-01-01', archivedAt: null, replacedBy: null, version: 1, r2Key: 'admin/shared/missing/file.pdf' };
  const { env, log } = mockEnv({ active: item });
  const archived = await resourceAdmin({ request: new Request('https://staging.example/api/admin/resources', { method: 'POST' }), env, user: 'owner', role: 'owner', section: 'resources', action: 'archive', data: { id: item.id }, mutate: async (statements, action) => { assert.equal(action, 'shared_resource.archive'); assert.equal(statements.length, 2); } });
  assert.equal(archived.status, 200);
  assert.equal(log.puts.length + log.gets.length, 0, 'archive changes catalog state without deleting R2 content');
  const originalPrepare = env.DB.prepare.bind(env.DB);
  env.DB.prepare = (sql) => {
    const statement = originalPrepare(sql);
    if (sql.includes('SELECT id,title,r2_key AS r2Key')) statement.all = async () => ({ results: [{ id: item.id, title: item.title, status: 'archived', r2Key: item.r2Key }] });
    return statement;
  };
  const integrity = await resourceAdmin({ request: new Request('https://staging.example/api/admin/resources'), env, user: 'editor', role: 'editor', section: 'resources', action: 'integrity' });
  const check = await integrity.json();
  assert.equal(check.broken, 1);
  assert.equal(check.links[0].integrity, 'missing');
  assert.equal(log.puts.length, 0, 'integrity checks are read-only');
});
