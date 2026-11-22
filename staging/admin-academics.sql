-- Additive academic revision history for the isolated staging database.
-- Existing review_academic_groups remains the compatibility projection.
CREATE TABLE IF NOT EXISTS review_academic_revisions (
  id TEXT PRIMARY KEY,
  configuration TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft','published')),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  published_at TEXT
);
CREATE INDEX IF NOT EXISTS review_academic_revisions_created
  ON review_academic_revisions(created_at DESC);
CREATE TABLE IF NOT EXISTS review_academic_active (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  revision_id TEXT NOT NULL REFERENCES review_academic_revisions(id),
  changed_at TEXT NOT NULL
);
