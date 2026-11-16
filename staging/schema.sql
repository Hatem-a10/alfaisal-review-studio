-- Staging-only supplemental schema. No production data or fixture records.
CREATE TABLE IF NOT EXISTS review_academic_groups (
 class_code TEXT NOT NULL,
 group_code TEXT NOT NULL,
 configuration TEXT NOT NULL,
 PRIMARY KEY (class_code, group_code)
);
