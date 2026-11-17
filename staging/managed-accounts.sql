-- Apply explicitly to the isolated staging DB only. No deletes, imports or legacy maps.
CREATE TABLE IF NOT EXISTS review_accounts (
 id TEXT PRIMARY KEY,
 email TEXT NOT NULL,
 provider_name TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL,
 last_seen_at TEXT NOT NULL,
 disabled INTEGER NOT NULL DEFAULT 0,
 analytics_opt_in INTEGER NOT NULL DEFAULT 0,
 admin_panel_unlocked INTEGER NOT NULL DEFAULT 0,
 profile_json TEXT NOT NULL DEFAULT '{}',
 analytics_json TEXT NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS review_managed_admin_rate (
 account_id TEXT PRIMARY KEY,
 window INTEGER NOT NULL,
 attempts INTEGER NOT NULL
);
