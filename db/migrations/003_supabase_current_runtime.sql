CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS staff_users (
  id text PRIMARY KEY,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('ADMIN', 'EVENT_MANAGER', 'DOOR_STAFF')),
  active boolean NOT NULL DEFAULT true,
  created_at text NOT NULL,
  updated_at text NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS staff_users_email_lower_idx ON staff_users (lower(email));

CREATE TABLE IF NOT EXISTS staff_sessions (
  token_hash text PRIMARY KEY,
  staff_user_id text NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  created_at text NOT NULL,
  expires_at text NOT NULL,
  revoked_at text
);

CREATE INDEX IF NOT EXISTS staff_sessions_user_idx ON staff_sessions(staff_user_id);
CREATE INDEX IF NOT EXISTS staff_sessions_expiry_idx ON staff_sessions(expires_at);

CREATE TABLE IF NOT EXISTS event_categories (
  id text PRIMARY KEY,
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  sort_order integer NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at text NOT NULL,
  updated_at text NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS event_categories_name_lower_idx ON event_categories (lower(name));
CREATE UNIQUE INDEX IF NOT EXISTS event_categories_slug_lower_idx ON event_categories (lower(slug));

INSERT INTO event_categories(id,name,slug,sort_order,enabled,created_at,updated_at) VALUES
  ('cat-music','Music','music',10,true,now()::text,now()::text),
  ('cat-workshops','Workshops','workshops',20,true,now()::text,now()::text),
  ('cat-comedy','Comedy','comedy',30,true,now()::text,now()::text),
  ('cat-art','Art','art',40,true,now()::text,now()::text),
  ('cat-food','Food','food',50,true,now()::text,now()::text),
  ('cat-conversations','Conversations','conversations',60,true,now()::text,now()::text)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS admin_events (
  id text PRIMARY KEY,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  short_summary text NOT NULL,
  full_description text NOT NULL,
  category_id text NOT NULL REFERENCES event_categories(id) ON DELETE RESTRICT,
  cover_image_key text,
  host_artist text NOT NULL,
  event_date text NOT NULL,
  doors_open_time text NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  venue text NOT NULL,
  age_guidance text NOT NULL,
  languages text NOT NULL,
  accessibility_information text NOT NULL,
  special_instructions text NOT NULL DEFAULT '',
  featured boolean NOT NULL DEFAULT false,
  seo_title text NOT NULL DEFAULT '',
  seo_description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PUBLISHED','POSTPONED','CANCELLED','COMPLETED','ARCHIVED')),
  status_reason text,
  published_at text,
  created_by text REFERENCES staff_users(id),
  updated_by text REFERENCES staff_users(id),
  created_at text NOT NULL,
  updated_at text NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_events_slug_lower_idx ON admin_events (lower(slug));
CREATE INDEX IF NOT EXISTS admin_events_status_date_idx ON admin_events(status,event_date);
CREATE INDEX IF NOT EXISTS admin_events_category_idx ON admin_events(category_id);
CREATE INDEX IF NOT EXISTS admin_events_updated_idx ON admin_events(updated_at DESC);

CREATE TABLE IF NOT EXISTS event_status_history (
  id text PRIMARY KEY,
  event_id text NOT NULL REFERENCES admin_events(id) ON DELETE CASCADE,
  from_status text NOT NULL,
  to_status text NOT NULL,
  reason text,
  changed_by text NOT NULL REFERENCES staff_users(id),
  changed_at text NOT NULL
);

CREATE INDEX IF NOT EXISTS event_status_history_event_idx ON event_status_history(event_id,changed_at DESC);

CREATE TABLE IF NOT EXISTS admin_tickets (
  id text PRIMARY KEY,
  event_id text NOT NULL REFERENCES admin_events(id) ON DELETE CASCADE,
  sold_at text NOT NULL
);

CREATE INDEX IF NOT EXISTS admin_tickets_event_idx ON admin_tickets(event_id);

CREATE TABLE IF NOT EXISTS admin_payment_proofs (
  id text PRIMARY KEY,
  status text NOT NULL CHECK (status IN ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED')),
  submitted_at text NOT NULL
);

CREATE INDEX IF NOT EXISTS admin_payment_proofs_status_idx ON admin_payment_proofs(status);

CREATE TABLE IF NOT EXISTS admin_check_ins (
  id text PRIMARY KEY,
  ticket_id text NOT NULL REFERENCES admin_tickets(id) ON DELETE CASCADE,
  checked_in_at timestamptz NOT NULL,
  undone_at timestamptz
);

CREATE INDEX IF NOT EXISTS admin_check_ins_date_idx ON admin_check_ins(checked_in_at);

CREATE TABLE IF NOT EXISTS ticket_tiers (
  id text PRIMARY KEY,
  event_id text NOT NULL REFERENCES admin_events(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  price_minor integer NOT NULL CHECK (price_minor >= 0),
  capacity integer NOT NULL CHECK (capacity >= 0),
  max_per_order integer NOT NULL CHECK (max_per_order >= 1),
  sales_start text NOT NULL,
  sales_end text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL,
  created_by text REFERENCES staff_users(id),
  updated_by text REFERENCES staff_users(id),
  created_at text NOT NULL,
  updated_at text NOT NULL,
  CHECK (sales_end > sales_start)
);

CREATE INDEX IF NOT EXISTS ticket_tiers_event_order_idx ON ticket_tiers(event_id, sort_order);

CREATE TABLE IF NOT EXISTS checkout_orders (
  id text PRIMARY KEY,
  reference text NOT NULL UNIQUE,
  access_key_hash text NOT NULL UNIQUE,
  event_id text NOT NULL REFERENCES admin_events(id) ON DELETE RESTRICT,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  status text NOT NULL CHECK (status IN ('AWAITING_PAYMENT_PROOF','PAYMENT_PROOF_SUBMITTED','UNDER_ORGANISER_REVIEW','PAYMENT_REJECTED','CONFIRMED','EXPIRED','CANCELLED','REFUNDED')),
  subtotal_minor integer NOT NULL CHECK (subtotal_minor >= 0),
  fee_minor integer NOT NULL DEFAULT 0 CHECK (fee_minor >= 0),
  total_minor integer NOT NULL CHECK (total_minor >= 0),
  currency text NOT NULL DEFAULT 'PKR' CHECK (currency = 'PKR'),
  consented_at text NOT NULL,
  reservation_expires_at text NOT NULL,
  created_at text NOT NULL,
  updated_at text NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS checkout_orders_reference_lower_idx ON checkout_orders (lower(reference));
CREATE INDEX IF NOT EXISTS checkout_orders_event_status_idx ON checkout_orders(event_id, status);
CREATE INDEX IF NOT EXISTS checkout_orders_expiry_idx ON checkout_orders(status, reservation_expires_at);
CREATE INDEX IF NOT EXISTS checkout_orders_customer_idx ON checkout_orders(email, phone);

CREATE TABLE IF NOT EXISTS checkout_order_items (
  id text PRIMARY KEY,
  order_id text NOT NULL REFERENCES checkout_orders(id) ON DELETE CASCADE,
  tier_id text NOT NULL REFERENCES ticket_tiers(id) ON DELETE RESTRICT,
  tier_name text NOT NULL,
  quantity integer NOT NULL CHECK (quantity >= 1),
  unit_price_minor integer NOT NULL CHECK (unit_price_minor >= 0),
  line_total_minor integer NOT NULL CHECK (line_total_minor >= 0)
);

CREATE INDEX IF NOT EXISTS checkout_order_items_tier_idx ON checkout_order_items(tier_id);

CREATE TABLE IF NOT EXISTS event_images (
  key text PRIMARY KEY,
  event_id text REFERENCES admin_events(id) ON DELETE CASCADE,
  mime text NOT NULL,
  data bytea NOT NULL,
  created_at text NOT NULL
);

CREATE INDEX IF NOT EXISTS event_images_event_idx ON event_images(event_id);
