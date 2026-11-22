-- Additive schema for the Cloudflare staging Admin Control Center.
-- Shared academic assets only; personal student uploads remain in study_materials
-- and are deliberately outside this catalog.
CREATE TABLE IF NOT EXISTS admin_shared_resources (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime TEXT NOT NULL,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('pdf','image','anki')),
  bytes INTEGER NOT NULL CHECK (bytes > 0),
  sha256 TEXT NOT NULL,
  r2_key TEXT NOT NULL UNIQUE,
  course TEXT NOT NULL CHECK (course IN ('CVP','MOL','REN','OTHER')),
  lecture_id TEXT NOT NULL DEFAULT '',
  topic TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  uploaded_by TEXT NOT NULL,
  uploaded_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  replaced_by TEXT REFERENCES admin_shared_resources(id),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0)
);
CREATE INDEX IF NOT EXISTS admin_shared_resources_status_course
  ON admin_shared_resources(status, course, uploaded_at DESC);
CREATE INDEX IF NOT EXISTS admin_shared_resources_sha
  ON admin_shared_resources(sha256, status);
CREATE UNIQUE INDEX IF NOT EXISTS admin_shared_resources_one_active_sha
  ON admin_shared_resources(sha256) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS admin_shared_resource_revisions (
  id TEXT PRIMARY KEY,
  resource_id TEXT NOT NULL REFERENCES admin_shared_resources(id),
  revision INTEGER NOT NULL,
  title TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  course TEXT NOT NULL,
  lecture_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  changed_by TEXT NOT NULL,
  changed_at TEXT NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('replaced','archived')),
  UNIQUE(resource_id, revision)
);
CREATE INDEX IF NOT EXISTS admin_shared_resource_revisions_resource
  ON admin_shared_resource_revisions(resource_id, revision DESC);

-- Written only by a trusted backup workflow after it verifies an actual backup.
-- The web application only reads these receipts; it cannot initiate restore/delete.
CREATE TABLE IF NOT EXISTS admin_backup_receipts (
  id TEXT PRIMARY KEY,
  environment TEXT NOT NULL CHECK (environment IN ('staging','production')),
  provider TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('verified','failed')),
  components_json TEXT NOT NULL DEFAULT '{}',
  verification_ref TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS admin_backup_receipts_environment
  ON admin_backup_receipts(environment, completed_at DESC);
