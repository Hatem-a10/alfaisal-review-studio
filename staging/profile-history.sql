-- Apply before deploying profile history. No backfill or changes to existing account rows.
CREATE TABLE IF NOT EXISTS review_profile_history (
 revision INTEGER PRIMARY KEY,
 account_id TEXT NOT NULL,
 changed_at TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('profile','assignment','identity')),
 before_json TEXT NOT NULL,
 after_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS review_profile_history_account ON review_profile_history(account_id,revision DESC);
CREATE TRIGGER IF NOT EXISTS review_profile_history_profile AFTER UPDATE OF profile_json ON review_accounts
WHEN OLD.profile_json IS NOT NEW.profile_json
BEGIN
 INSERT INTO review_profile_history(account_id,changed_at,kind,before_json,after_json)
 VALUES (NEW.id,strftime('%Y-%m-%dT%H:%M:%fZ','now'),'profile',OLD.profile_json,NEW.profile_json);
END;
CREATE TRIGGER IF NOT EXISTS review_profile_history_identity AFTER UPDATE OF provider_name,email ON review_accounts
WHEN OLD.provider_name IS NOT NEW.provider_name OR OLD.email IS NOT NEW.email
BEGIN
 INSERT INTO review_profile_history(account_id,changed_at,kind,before_json,after_json)
 VALUES (NEW.id,strftime('%Y-%m-%dT%H:%M:%fZ','now'),'identity',
  json_object('providerName',OLD.provider_name,'email',OLD.email),json_object('providerName',NEW.provider_name,'email',NEW.email));
END;
CREATE TRIGGER IF NOT EXISTS review_profile_history_assignment_insert AFTER INSERT ON control_students
WHEN NEW.assignment IS NOT NULL
BEGIN
 INSERT INTO review_profile_history(account_id,changed_at,kind,before_json,after_json)
 VALUES (NEW.account_id,strftime('%Y-%m-%dT%H:%M:%fZ','now'),'assignment','{}',NEW.assignment);
END;
CREATE TRIGGER IF NOT EXISTS review_profile_history_assignment_update AFTER UPDATE OF assignment ON control_students
WHEN OLD.assignment IS NOT NEW.assignment
BEGIN
 INSERT INTO review_profile_history(account_id,changed_at,kind,before_json,after_json)
 VALUES (NEW.account_id,strftime('%Y-%m-%dT%H:%M:%fZ','now'),'assignment',coalesce(OLD.assignment,'{}'),coalesce(NEW.assignment,'{}'));
END;
CREATE TRIGGER IF NOT EXISTS review_profile_history_cap AFTER INSERT ON review_profile_history
BEGIN
 DELETE FROM review_profile_history WHERE account_id=NEW.account_id AND revision IN (
  SELECT revision FROM review_profile_history WHERE account_id=NEW.account_id ORDER BY revision DESC LIMIT -1 OFFSET 30
 );
END;
