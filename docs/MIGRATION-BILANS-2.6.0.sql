-- Documentation of additive tables created automatically by initializeAssessments.
-- Do not run a reset/restore or delete existing tables. No old JSON document is rewritten.
CREATE TABLE IF NOT EXISTS assessment_tracking(
 assessment_id TEXT PRIMARY KEY,
 deleted_at TEXT,
 deleted_by TEXT,
 titan_at TEXT,
 titan_by TEXT,
 titan_name TEXT
);
CREATE TABLE IF NOT EXISTS assessment_versions(
 id INTEGER PRIMARY KEY,
 assessment_id TEXT NOT NULL,
 at TEXT NOT NULL,
 actor TEXT NOT NULL,
 data TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS assessment_documents(
 assessment_id TEXT PRIMARY KEY,
 pdf BLOB NOT NULL,
 created_at TEXT NOT NULL,
 format_version INTEGER NOT NULL
);
