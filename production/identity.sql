-- Apply only after schema and zero-student checks on the designated fresh production D1.
-- This is a runtime cross-environment guard. It is not a secret or a substitute for isolated bindings.
CREATE TABLE IF NOT EXISTS review_release_environment (
 id INTEGER PRIMARY KEY CHECK (id=1),
 environment TEXT NOT NULL CHECK (environment='production')
);
INSERT OR IGNORE INTO review_release_environment (id,environment) VALUES (1,'production');
