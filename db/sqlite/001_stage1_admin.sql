PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS staff_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'EVENT_MANAGER', 'DOOR_STAFF')),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS staff_sessions (
  token_hash TEXT PRIMARY KEY,
  staff_user_id TEXT NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE INDEX IF NOT EXISTS staff_sessions_user_idx ON staff_sessions(staff_user_id);
CREATE INDEX IF NOT EXISTS staff_sessions_expiry_idx ON staff_sessions(expires_at);

CREATE TABLE IF NOT EXISTS admin_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('DRAFT', 'UPCOMING', 'PUBLISHED', 'SOLD_OUT', 'POSTPONED', 'COMPLETED', 'CANCELLED')),
  starts_at TEXT NOT NULL,
  published_at TEXT
);

CREATE TABLE IF NOT EXISTS admin_tickets (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES admin_events(id) ON DELETE CASCADE,
  sold_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_payment_proofs (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED')),
  submitted_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_check_ins (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES admin_tickets(id) ON DELETE CASCADE,
  checked_in_at TEXT NOT NULL,
  undone_at TEXT
);

CREATE INDEX IF NOT EXISTS admin_events_status_idx ON admin_events(status, starts_at);
CREATE INDEX IF NOT EXISTS admin_payment_proofs_status_idx ON admin_payment_proofs(status);
CREATE INDEX IF NOT EXISTS admin_check_ins_date_idx ON admin_check_ins(checked_in_at);
