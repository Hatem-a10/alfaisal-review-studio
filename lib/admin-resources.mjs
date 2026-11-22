const MAX_UPLOAD = 25 * 1024 * 1024;
const MAX_MULTIPART_BODY = MAX_UPLOAD + 1024 * 1024;
const LIST_LIMIT = 100;
const SHARED_PREFIX = 'admin/shared/';
const STORAGE_LIST_CAP = 5000;
const RESOURCE_COLUMNS = `id, title, filename, mime, resource_type AS resourceType,
  bytes, sha256, course, lecture_id AS lectureId, topic, status,
  uploaded_by AS uploadedBy, uploaded_at AS uploadedAt, updated_at AS updatedAt,
  archived_at AS archivedAt, replaced_by AS replacedBy, version`;

const json = (value, status = 200) => Response.json(value, {
  status,
  headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
});
const bad = (error, status = 400) => json({ error }, status);
const clean = (value, max = 160) => String(value ?? '').trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, max);
const roleName = (role) => typeof role === 'string' ? role.toLowerCase().replace(/[ -]/g, '_') :
  String(role?.name ?? role?.role ?? '').toLowerCase().replace(/[ -]/g, '_');
const isOwner = (role) => roleName(role) === 'owner';
const canEdit = (role) => isOwner(role) || roleName(role) === 'editor';
const now = () => new Date().toISOString();

function safeFilename(value) {
  const name = clean(value, 240).split(/[\\/]/).pop() || 'resource';
  return name.replace(/[^\p{L}\p{N}._() -]/gu, '_').replace(/\s+/g, ' ').trim().slice(0, 180) || 'resource';
}

function detectResource(filename, bytes) {
  const ext = filename.toLowerCase().split('.').pop();
  const b = new Uint8Array(bytes.slice(0, 16));
  if (ext === 'pdf' && b.length >= 5 && String.fromCharCode(...b.slice(0, 5)) === '%PDF-') return { type: 'pdf', mime: 'application/pdf' };
  if (['png','jpg','jpeg','webp'].includes(ext)) {
    if (ext === 'png' && b.length >= 8 && [137,80,78,71,13,10,26,10].every((n, i) => b[i] === n)) return { type: 'image', mime: 'image/png' };
    if (['jpg','jpeg'].includes(ext) && b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { type: 'image', mime: 'image/jpeg' };
    if (ext === 'webp' && b.length >= 12 && String.fromCharCode(...b.slice(0,4)) === 'RIFF' && String.fromCharCode(...b.slice(8,12)) === 'WEBP') return { type: 'image', mime: 'image/webp' };
  }
  if (['apkg','colpkg'].includes(ext) && b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b && [0x03,0x05,0x07].includes(b[2]) && [0x04,0x06,0x08].includes(b[3])) return { type: 'anki', mime: 'application/octet-stream' };
  return null;
}

function contentDisposition(filename) {
  const fallback = filename.normalize('NFKD').replace(/[^\x20-\x7e]/g, '_').replace(/["\\;]/g, '_').slice(0, 160) || 'resource';
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

async function sha256(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function prepared(env, sql, ...values) { return env.DB.prepare(sql).bind(...values); }
function authorized(section, role) {
  return section === 'storage' ? isOwner(role) : canEdit(role);
}
function mutation(mutate, statements, action, target) {
  if (typeof mutate === 'function') return mutate(statements, action, target);
  return Promise.reject(new Error('Administrative mutation service is unavailable.'));
}

async function bodyForm(request) {
  const length = Number(request.headers.get('content-length'));
  if (Number.isFinite(length) && length > MAX_MULTIPART_BODY) throw Object.assign(new Error('Maximum upload size is 25 MB.'), { status: 413 });
  if (!request.body) throw Object.assign(new Error('Upload body is empty.'), { status: 400 });
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_MULTIPART_BODY) {
        await reader.cancel('Multipart body exceeds limit');
        throw Object.assign(new Error('Maximum upload size is 25 MB.'), { status: 413 });
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error?.status) throw error;
    throw Object.assign(new Error('Upload body could not be read.'), { status: 400 });
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  try {
    const replay = new Request(request.url, { method: 'POST', headers: { 'content-type': request.headers.get('content-type') || '' }, body });
    return await replay.formData();
  }
  catch { throw Object.assign(new Error('Invalid multipart upload.'), { status: 400 }); }
}

async function listResources({ env, url }) {
  const limit = Math.max(1, Math.min(LIST_LIMIT, Number.parseInt(url.searchParams.get('limit') || '50', 10) || 50));
  const q = clean(url.searchParams.get('q'), 100).toLowerCase();
  const course = clean(url.searchParams.get('course'), 12).toUpperCase();
  const status = ['active','archived'].includes(url.searchParams.get('status')) ? url.searchParams.get('status') : '';
  const offset = Math.max(0, Math.min(100000, Number.parseInt(url.searchParams.get('offset') || '0', 10) || 0));
  const where = [], args = [];
  if (q) { where.push('(lower(title) LIKE ? OR lower(filename) LIKE ? OR lower(lecture_id) LIKE ? OR lower(topic) LIKE ?)'); const term = `%${q}%`; args.push(term, term, term, term); }
  if (['CVP','MOL','REN','OTHER'].includes(course)) { where.push('course = ?'); args.push(course); }
  if (status) { where.push('status = ?'); args.push(status); }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows, count] = await Promise.all([
    env.DB.prepare(`SELECT ${RESOURCE_COLUMNS} FROM admin_shared_resources ${clause} ORDER BY uploaded_at DESC LIMIT ? OFFSET ?`).bind(...args, limit, offset).all(),
    env.DB.prepare(`SELECT COUNT(*) AS total FROM admin_shared_resources ${clause}`).bind(...args).first(),
  ]);
  return { resources: rows.results || [], total: Number(count?.total || 0), limit, offset };
}

async function uploadResource({ request, env, user, data, mutate, replacingId, requiresReplacement = false }) {
  if (!env.DB || !env.BUCKET) return bad('Shared resource storage is unavailable.', 503);
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return bad('Invalid request origin.', 403);
  let form;
  try { form = await bodyForm(request); } catch (error) { return bad(error.message, error.status || 400); }
  const file = form.get('file');
  if (!(file instanceof File) || file.size < 1 || file.size > MAX_UPLOAD) return bad('Choose a PDF, image, or Anki package up to 25 MB.');
  const filename = safeFilename(file.name);
  const bytes = await file.arrayBuffer();
  const detected = detectResource(filename, bytes);
  if (!detected) return bad('Supported shared resources are PDF, PNG/JPEG/WebP images, and APKG/COLPKG Anki files with matching file contents.');
  const { type, mime } = detected;
  const title = clean(form.get('title') || data?.title || filename.replace(/\.[^.]+$/, ''), 160);
  const course = clean(form.get('course') || data?.course, 12).toUpperCase();
  if (!title || !['CVP','MOL','REN','OTHER'].includes(course)) return bad('A title and valid course category are required.');
  const lectureId = clean(form.get('lectureId') || data?.lectureId, 80);
  const topic = clean(form.get('topic') || data?.topic, 120);
  if (lectureId && !/^[A-Za-z0-9][A-Za-z0-9 ._:/-]{0,79}$/.test(lectureId)) return bad('Lecture label contains unsupported characters.');
  const sha = await sha256(bytes);
  const multipartId = clean(form.get('id'), 40);
  const targetId = replacingId || (requiresReplacement ? multipartId : '');
  if (requiresReplacement && !targetId) return bad('A resource ID is required to replace an existing item.');
  if (targetId && !/^[0-9a-f-]{36}$/i.test(targetId)) return bad('Invalid resource ID.');
  const duplicate = await env.DB.prepare("SELECT id, title, status, sha256 FROM admin_shared_resources WHERE sha256 = ? AND status = 'active' LIMIT 1").bind(sha).first();
  if (duplicate && duplicate.id === targetId) return json({ unchanged: true, resourceId: duplicate.id, message: 'This resource already has identical content.' });
  if (duplicate) return json({ error: 'An identical active resource already exists.', duplicate: { id: duplicate.id, title: duplicate.title, status: duplicate.status } }, 409);

  const previous = targetId ? await env.DB.prepare(`SELECT ${RESOURCE_COLUMNS}, r2_key AS r2Key FROM admin_shared_resources WHERE id = ? AND status = 'active'`).bind(targetId).first() : null;
  if (targetId && !previous) return bad('The resource to replace is not active.', 404);
  const id = crypto.randomUUID();
  const uploadedAt = now();
  const key = `${SHARED_PREFIX}${id}/${filename}`;
  try {
    await env.BUCKET.put(key, bytes, { httpMetadata: { contentType: mime, contentDisposition: contentDisposition(filename) }, customMetadata: { id, sha256: sha, visibility: 'shared' } });
  } catch { return bad('The file could not be saved to shared storage.', 502); }
  const revNo = previous ? Number(previous.version || 1) : 0;
  const statements = [];
  if (previous) statements.push(prepared(env, `INSERT INTO admin_shared_resource_revisions (id,resource_id,revision,title,filename,mime,bytes,sha256,r2_key,course,lecture_id,topic,changed_by,changed_at,change_type) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, crypto.randomUUID(), previous.id, revNo, previous.title, previous.filename, previous.mime, previous.bytes, previous.sha256, previous.r2Key, previous.course, previous.lectureId, previous.topic, user, uploadedAt, 'replaced'));
  statements.push(prepared(env, `INSERT INTO admin_shared_resources (id,title,filename,mime,resource_type,bytes,sha256,r2_key,course,lecture_id,topic,status,uploaded_by,uploaded_at,updated_at,version) VALUES (?,?,?,?,?,?,?,?,?,?,?,'active',?,?,?,?)`, id, title, filename, mime, type, file.size, sha, key, course, lectureId, topic, user, uploadedAt, uploadedAt, revNo + 1));
  if (previous) statements.push(prepared(env, `UPDATE admin_shared_resources SET status='archived',archived_at=?,updated_at=?,replaced_by=?,version=version+1 WHERE id=? AND status='active'`, uploadedAt, uploadedAt, id, previous.id));
  try { await mutation(mutate, statements, previous ? 'shared_resource.replace' : 'shared_resource.upload', id); }
  catch {
    const activeDuplicate = await env.DB.prepare("SELECT id,title,status FROM admin_shared_resources WHERE sha256=? AND status='active' LIMIT 1").bind(sha).first().catch(() => null);
    if (activeDuplicate) return json({ error: 'An identical active resource was saved by another request.', duplicate: activeDuplicate, orphanCandidate: true }, 409);
    return json({ error: 'The file is present in shared storage, but its catalog update failed. It remains an uncataloged orphan candidate and can be reviewed from Storage; no file was deleted.', orphanCandidate: true }, 503);
  }
  return json({ resource: { id, title, filename, mime, resourceType: type, bytes: file.size, sha256: sha, course, lectureId, topic, status: 'active', uploadedBy: user, uploadedAt, updatedAt: uploadedAt, version: revNo + 1 }, replaced: previous ? previous.id : null }, previous ? 200 : 201);
}

async function archiveResource({ env, user, id, mutate }) {
  if (!env.DB || !env.BUCKET) return bad('Shared resource storage is unavailable.', 503);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return bad('Invalid resource ID.');
  const item = await env.DB.prepare(`SELECT ${RESOURCE_COLUMNS},r2_key AS r2Key FROM admin_shared_resources WHERE id=? AND status='active'`).bind(id).first();
  if (!item) return bad('Active resource not found.', 404);
  const at = now();
  const stmts = [
    prepared(env, `INSERT INTO admin_shared_resource_revisions (id,resource_id,revision,title,filename,mime,bytes,sha256,r2_key,course,lecture_id,topic,changed_by,changed_at,change_type) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, crypto.randomUUID(), item.id, item.version, item.title, item.filename, item.mime, item.bytes, item.sha256, item.r2Key, item.course, item.lectureId, item.topic, user, at, 'archived'),
    prepared(env, `UPDATE admin_shared_resources SET status='archived',archived_at=?,updated_at=?,version=version+1 WHERE id=? AND status='active'`, at, at, id),
  ];
  try { await mutation(mutate, stmts, 'shared_resource.archive', id); }
  catch { return bad('The resource could not be archived.', 503); }
  return json({ archived: true, id, archivedAt: at });
}

async function integrityCheck({ env, url }) {
  const limit = Math.max(1, Math.min(100, Number.parseInt(url.searchParams.get('limit') || '50', 10) || 50));
  const offset = Math.max(0, Math.min(100000, Number.parseInt(url.searchParams.get('offset') || '0', 10) || 0));
  const { results = [] } = await env.DB.prepare(`SELECT id,title,r2_key AS r2Key,status FROM admin_shared_resources ORDER BY updated_at DESC LIMIT ? OFFSET ?`).bind(limit, offset).all();
  const links = await Promise.all(results.map(async (row) => {
    try { const head = await env.BUCKET.head(row.r2Key); return { id: row.id, title: row.title, status: row.status, integrity: head ? 'available' : 'missing' }; }
    catch { return { id: row.id, title: row.title, status: row.status, integrity: 'unavailable' }; }
  }));
  return json({ checked: links.length, broken: links.filter((x) => x.integrity === 'missing').length, links, limit, offset });
}

async function storageSummary({ env }) {
  if (!env.DB || !env.BUCKET) return bad('Storage metrics are unavailable.', 503);
  const rawEnvironment = String(env.REVIEW_STUDIO_DEPLOYMENT || env.ENVIRONMENT || env.REVIEW_STUDIO_ENV || env.APP_ENV || 'unknown').toLowerCase();
  const environment = rawEnvironment.includes('prod') ? 'production' : rawEnvironment.includes('stag') ? 'staging' : 'unknown';
  const [counts, backup, privateMaterials, progressBytes, uploadFailures, catalogKeys] = await Promise.all([
    env.DB.prepare(`SELECT status,resource_type AS resourceType,COUNT(*) AS files,COALESCE(SUM(bytes),0) AS bytes FROM admin_shared_resources GROUP BY status,resource_type`).all(),
    environment === 'unknown' ? Promise.resolve({ results: [] }) : env.DB.prepare(`SELECT id,provider,completed_at AS completedAt,status,components_json AS componentsJson,verification_ref AS verificationRef FROM admin_backup_receipts WHERE environment=? ORDER BY completed_at DESC LIMIT 10`).bind(environment).all(),
    env.DB.prepare(`SELECT COUNT(*) AS files,COALESCE(SUM(bytes),0) AS bytes FROM study_materials`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS records,COALESCE(SUM(length(CAST(snapshot AS BLOB))),0) AS logicalBytes FROM study_snapshots`).first(),
    env.DB.prepare(`SELECT COALESCE(SUM(count),0) AS count FROM control_daily WHERE day>=date('now','-29 days') AND kind='upload-failed'`).first(),
    env.DB.prepare(`SELECT r2_key AS r2Key FROM admin_shared_resources LIMIT ?`).bind(STORAGE_LIST_CAP + 1).all(),
  ]);
  let r2 = { files: 0, bytes: 0, complete: true, orphanCandidates: 0 };
  try {
    let cursor;
    let pages = 0;
    const known = new Set((catalogKeys.results || []).slice(0, STORAGE_LIST_CAP).map((row) => row.r2Key));
    do {
      const page = await env.BUCKET.list({ prefix: SHARED_PREFIX, limit: 1000, ...(cursor ? { cursor } : {}) });
      for (const obj of page.objects || []) {
        r2.files++;
        r2.bytes += Number(obj.size || 0);
        if (!known.has(obj.key)) r2.orphanCandidates++;
      }
      cursor = page.truncated ? page.cursor : undefined;
      pages++;
      if (cursor && pages >= STORAGE_LIST_CAP / 1000) { r2.complete = false; break; }
    } while (cursor);
  } catch { r2.complete = false; }
  const catalog = (counts.results || []).map((r) => ({ status: r.status, resourceType: r.resourceType, files: Number(r.files), bytes: Number(r.bytes) }));
  const receipts = (backup.results || []).map((x) => ({ id: x.id, provider: x.provider, completedAt: x.completedAt, status: x.status, components: parseJSON(x.componentsJson), verificationRef: x.verificationRef }));
  const orphanCountComplete = r2.complete && (catalogKeys.results || []).length <= STORAGE_LIST_CAP;
  return json({
    environment,
    sharedResources: { r2Files: r2.files, r2Bytes: r2.bytes, measurementComplete: r2.complete, orphanCandidates: orphanCountComplete ? r2.orphanCandidates : null, orphanCandidateCountLowerBound: r2.orphanCandidates, orphanCountComplete, scannedObjectLimit: STORAGE_LIST_CAP, catalog },
    personalStudentStorage: { available: true, files: Number(privateMaterials?.files || 0), bytes: Number(privateMaterials?.bytes || 0), scope: 'Aggregate study_materials count and bytes only; no student identifiers, filenames, or keys.' },
    progressDatabase: { available: true, records: Number(progressBytes?.records || 0), logicalBytes: Number(progressBytes?.logicalBytes || 0), scope: 'Aggregate UTF-8 snapshot JSON bytes; excludes D1 physical storage overhead.' },
    uploads: { failed: Number(uploadFailures?.count || 0), windowDays: 30, kind: 'upload-failed', source: 'control_daily' },
    backups: { configured: receipts.length > 0, receipts, status: receipts.some((r) => r.status === 'verified') ? 'verified' : receipts.length ? 'attention' : 'not_configured' },
  });
}

function parseJSON(value) { try { return JSON.parse(value || '{}'); } catch { return {}; } }

/** Handles the authenticated, server-authorized admin resource and storage API. */
export async function resourceAdmin({ request, env, user, role, section, action, data, mutate }) {
  if (!['resources','storage'].includes(section)) return null;
  if (!authorized(section, role)) return bad('You are not authorized to manage this section.', 403);
  if (!user?.id && typeof user !== 'string') return bad('Verified account identity is required.', 401);
  const url = new URL(request.url);
  if (section === 'storage') {
    if (request.method !== 'GET' || action !== 'summary') return bad('Storage supports read-only summary access.', 405);
    return storageSummary({ env });
  }
  if (!env.DB) return bad('Resource catalog is unavailable.', 503);
  if (request.method === 'GET') {
    if (action === 'list') return json(await listResources({ env, url }));
    if (action === 'integrity') return integrityCheck({ env, url });
    if (action === 'revisions') {
      const id = clean(url.searchParams.get('id'), 40);
      if (!/^[0-9a-f-]{36}$/i.test(id)) return bad('Valid resource ID is required.');
      const rows = await env.DB.prepare(`SELECT revision,title,filename,mime,bytes,sha256,course,lecture_id AS lectureId,topic,changed_by AS changedBy,changed_at AS changedAt,change_type AS changeType FROM admin_shared_resource_revisions WHERE resource_id=? ORDER BY revision DESC LIMIT 50`).bind(id).all();
      return json({ revisions: rows.results || [] });
    }
    return null;
  }
  if (request.method !== 'POST') return bad('Method not allowed.', 405);
  if (action === 'upload') return uploadResource({ request, env, user: user?.id || user, data, mutate });
  if (action === 'replace') {
    const id = clean(data?.id || url.searchParams.get('id'), 40);
    return uploadResource({ request, env, user: user?.id || user, data, mutate, replacingId: id, requiresReplacement: true });
  }
  if (action === 'archive') return archiveResource({ env, user: user?.id || user, id: clean(data?.id, 40), mutate });
  return null;
}

/** Student-facing read-only shared library. Private materials are never queried here. */
export async function resourceStudent({ request, env, user, path }) {
  const identity = typeof user === 'string' ? user : user?.id;
  if (!identity) return bad('Sign in to browse shared resources.', 401);
  if (!env.DB || !env.BUCKET) return bad('Shared resource library is unavailable.', 503);
  if (request.method !== 'GET') return bad('Method not allowed.', 405);
  const route = String(path || new URL(request.url).pathname).replace(/\/$/, '');
  const match = route.match(/\/api\/control-center\/student\/resources\/([0-9a-f-]{36})(?:\/download)?$/i);
  if (match) {
    const row = await env.DB.prepare(`SELECT id,title,filename,mime,bytes,r2_key AS r2Key FROM admin_shared_resources WHERE id=? AND status='active'`).bind(match[1]).first();
    if (!row) return bad('Shared resource not found.', 404);
    const object = await env.BUCKET.get(row.r2Key);
    if (!object) return bad('This shared file is temporarily unavailable.', 503);
    const safe = safeFilename(row.filename);
    return new Response(object.body, { headers: { 'Content-Type': row.mime, 'Content-Length': String(row.bytes), 'Content-Disposition': contentDisposition(safe), 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
  }
  if (!route.endsWith('/api/control-center/student/resources')) return null;
  const limit = Math.max(1, Math.min(100, Number.parseInt(new URL(request.url).searchParams.get('limit') || '50', 10) || 50));
  const offset = Math.max(0, Math.min(100000, Number.parseInt(new URL(request.url).searchParams.get('offset') || '0', 10) || 0));
  const rows = await env.DB.prepare(`SELECT id,title,filename,mime,resource_type AS resourceType,bytes,course,lecture_id AS lectureId,topic,uploaded_at AS uploadedAt,version FROM admin_shared_resources WHERE status='active' ORDER BY course,lecture_id,title LIMIT ? OFFSET ?`).bind(limit, offset).all();
  const count = await env.DB.prepare(`SELECT COUNT(*) AS total FROM admin_shared_resources WHERE status='active'`).first();
  return json({ resources: (rows.results || []).map((r) => ({ ...r, downloadUrl: `/api/control-center/student/resources/${r.id}/download` })), total: Number(count?.total || 0), limit, offset });
}
