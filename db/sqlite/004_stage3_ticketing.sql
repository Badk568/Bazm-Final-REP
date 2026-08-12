PRAGMA foreign_keys = ON;

CREATE TABLE ticket_tiers (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES admin_events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price_minor INTEGER NOT NULL CHECK (price_minor >= 0),
  capacity INTEGER NOT NULL CHECK (capacity >= 0),
  max_per_order INTEGER NOT NULL CHECK (max_per_order >= 1),
  sales_start TEXT NOT NULL,
  sales_end TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  sort_order INTEGER NOT NULL,
  created_by TEXT REFERENCES staff_users(id),
  updated_by TEXT REFERENCES staff_users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (sales_end > sales_start)
);

CREATE TABLE checkout_orders (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL COLLATE NOCASE UNIQUE,
  access_key_hash TEXT NOT NULL UNIQUE,
  event_id TEXT NOT NULL REFERENCES admin_events(id) ON DELETE RESTRICT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE,
  phone TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('AWAITING_PAYMENT_PROOF','PAYMENT_PROOF_SUBMITTED','UNDER_ORGANISER_REVIEW','PAYMENT_REJECTED','CONFIRMED','EXPIRED','CANCELLED','REFUNDED')),
  subtotal_minor INTEGER NOT NULL CHECK (subtotal_minor >= 0),
  fee_minor INTEGER NOT NULL DEFAULT 0 CHECK (fee_minor >= 0),
  total_minor INTEGER NOT NULL CHECK (total_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'PKR' CHECK (currency = 'PKR'),
  consented_at TEXT NOT NULL,
  reservation_expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE checkout_order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES checkout_orders(id) ON DELETE CASCADE,
  tier_id TEXT NOT NULL REFERENCES ticket_tiers(id) ON DELETE RESTRICT,
  tier_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity >= 1),
  unit_price_minor INTEGER NOT NULL CHECK (unit_price_minor >= 0),
  line_total_minor INTEGER NOT NULL CHECK (line_total_minor >= 0)
);

CREATE INDEX ticket_tiers_event_order_idx ON ticket_tiers(event_id, sort_order);
CREATE INDEX checkout_orders_event_status_idx ON checkout_orders(event_id, status);
CREATE INDEX checkout_orders_expiry_idx ON checkout_orders(status, reservation_expires_at);
CREATE INDEX checkout_orders_customer_idx ON checkout_orders(email, phone);
CREATE INDEX checkout_order_items_tier_idx ON checkout_order_items(tier_id);
