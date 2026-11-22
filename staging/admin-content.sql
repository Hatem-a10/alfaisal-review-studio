-- Additive staging-only content moderation and announcement tables.
-- Does not copy, migrate, or expose private student study records.
CREATE TABLE IF NOT EXISTS review_question_reports (
 id TEXT PRIMARY KEY,
 reporter_id TEXT NOT NULL REFERENCES review_accounts(id) ON DELETE CASCADE,
 question_id TEXT NOT NULL,
 kind TEXT NOT NULL CHECK (kind IN ('incorrect-answer','incorrect-explanation','missing-source','ambiguous-wording','duplicate','broken-image','other','technical')),
 category TEXT NOT NULL,
 details TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','resolved','rejected')),
 review_note TEXT,
 reviewed_by TEXT,
 patch_json TEXT,
 source_reference TEXT,
 revision_status TEXT CHECK (revision_status IS NULL OR revision_status IN ('proposed','approved','rejected')),
 proposed_by TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS review_question_reports_status_time ON review_question_reports(status,created_at DESC);
CREATE INDEX IF NOT EXISTS review_question_reports_reporter_time ON review_question_reports(reporter_id,created_at DESC);

CREATE TABLE IF NOT EXISTS review_question_report_rate (
 reporter_id TEXT PRIMARY KEY REFERENCES review_accounts(id) ON DELETE CASCADE,
 window INTEGER NOT NULL,
 count INTEGER NOT NULL CHECK (count BETWEEN 1 AND 10)
);

CREATE TABLE IF NOT EXISTS review_question_revisions (
 id TEXT PRIMARY KEY,
 question_id TEXT NOT NULL,
 report_id TEXT NOT NULL REFERENCES review_question_reports(id) ON DELETE CASCADE,
 patch_json TEXT NOT NULL,
 source_reference TEXT NOT NULL,
 status TEXT NOT NULL CHECK (status IN ('approved','rejected')),
 proposed_by TEXT NOT NULL,
 approved_by TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS review_question_revisions_question_time ON review_question_revisions(question_id,created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS review_question_revisions_approved_once ON review_question_revisions(report_id) WHERE status='approved';

CREATE TABLE IF NOT EXISTS review_announcements (
 id TEXT PRIMARY KEY,
 title TEXT NOT NULL,
 body TEXT NOT NULL,
 audience TEXT NOT NULL CHECK (audience IN ('global','class','group','lab')),
 target_class TEXT,
 target_section TEXT,
 target_lab TEXT,
 priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal','important','urgent')),
 starts_at TEXT NOT NULL,
 expires_at TEXT,
 status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
 created_by TEXT NOT NULL,
 updated_by TEXT NOT NULL,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS review_announcements_status_time ON review_announcements(status,starts_at,expires_at);
