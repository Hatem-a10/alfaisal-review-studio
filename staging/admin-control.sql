CREATE TABLE IF NOT EXISTS control_students (
 account_id TEXT PRIMARY KEY,
 role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student','editor','moderator')),
 assignment TEXT,
 reset_id TEXT
);
CREATE TABLE IF NOT EXISTS control_settings (
 key TEXT PRIMARY KEY,
 value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS control_stepup (
 session_hash TEXT PRIMARY KEY,
 expires INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS control_rate (
 actor TEXT NOT NULL,
 bucket TEXT NOT NULL,
 window INTEGER NOT NULL,
 attempts INTEGER NOT NULL,
 PRIMARY KEY(actor,bucket)
);
CREATE TABLE IF NOT EXISTS control_audit (
 id TEXT PRIMARY KEY,
 actor TEXT NOT NULL,
 role TEXT NOT NULL,
 action TEXT NOT NULL,
 target TEXT NOT NULL,
 created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS control_audit_recent ON control_audit(created_at DESC,id);
CREATE TABLE IF NOT EXISTS control_daily (
 day TEXT NOT NULL,
 kind TEXT NOT NULL,
 count INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(day,kind)
);
