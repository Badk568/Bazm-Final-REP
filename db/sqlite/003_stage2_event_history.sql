CREATE TABLE IF NOT EXISTS event_status_history (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES admin_events(id) ON DELETE CASCADE,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  reason TEXT,
  changed_by TEXT NOT NULL REFERENCES staff_users(id),
  changed_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS event_status_history_event_idx ON event_status_history(event_id,changed_at DESC);
