PRAGMA foreign_keys = OFF;

CREATE TABLE IF NOT EXISTS event_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  slug TEXT NOT NULL COLLATE NOCASE UNIQUE,
  sort_order INTEGER NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT OR IGNORE INTO event_categories(id,name,slug,sort_order,enabled,created_at,updated_at) VALUES
  ('cat-music','Music','music',10,1,datetime('now'),datetime('now')),
  ('cat-workshops','Workshops','workshops',20,1,datetime('now'),datetime('now')),
  ('cat-comedy','Comedy','comedy',30,1,datetime('now'),datetime('now')),
  ('cat-art','Art','art',40,1,datetime('now'),datetime('now')),
  ('cat-food','Food','food',50,1,datetime('now'),datetime('now')),
  ('cat-conversations','Conversations','conversations',60,1,datetime('now'),datetime('now'));

DROP TABLE IF EXISTS admin_check_ins;
DROP TABLE IF EXISTS admin_tickets;
ALTER TABLE admin_events RENAME TO admin_events_stage1;

CREATE TABLE admin_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL COLLATE NOCASE UNIQUE,
  short_summary TEXT NOT NULL,
  full_description TEXT NOT NULL,
  category_id TEXT NOT NULL REFERENCES event_categories(id) ON DELETE RESTRICT,
  cover_image_key TEXT,
  host_artist TEXT NOT NULL,
  event_date TEXT NOT NULL,
  doors_open_time TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  venue TEXT NOT NULL,
  age_guidance TEXT NOT NULL,
  languages TEXT NOT NULL,
  accessibility_information TEXT NOT NULL,
  special_instructions TEXT NOT NULL DEFAULT '',
  featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0, 1)),
  seo_title TEXT NOT NULL DEFAULT '',
  seo_description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PUBLISHED','POSTPONED','CANCELLED','COMPLETED','ARCHIVED')),
  status_reason TEXT,
  published_at TEXT,
  created_by TEXT REFERENCES staff_users(id),
  updated_by TEXT REFERENCES staff_users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

DROP TABLE admin_events_stage1;

CREATE TABLE admin_tickets (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES admin_events(id) ON DELETE CASCADE,
  sold_at TEXT NOT NULL
);

CREATE TABLE admin_check_ins (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES admin_tickets(id) ON DELETE CASCADE,
  checked_in_at TEXT NOT NULL,
  undone_at TEXT
);

CREATE INDEX admin_events_status_date_idx ON admin_events(status,event_date);
CREATE INDEX admin_events_category_idx ON admin_events(category_id);
CREATE INDEX admin_events_updated_idx ON admin_events(updated_at DESC);
CREATE INDEX admin_tickets_event_idx ON admin_tickets(event_id);
CREATE INDEX admin_check_ins_date_idx ON admin_check_ins(checked_in_at);

PRAGMA foreign_keys = ON;
