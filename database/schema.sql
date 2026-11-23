-- =============================================================================
-- JayTech9 database (Cloudflare D1, which is SQLite)
-- One database shared by the website (forms, public content) and the CRM.
--
-- First time:   npx wrangler d1 execute jaytech9 --remote --file=database/schema.sql
-- Local copy:   npx wrangler d1 execute jaytech9 --local  --file=database/schema.sql
--
-- Safe to run again: every statement only creates what is missing.
-- To ADD a column later, write a new file in database/migrations/ (see README there),
-- never edit a table here that already holds real data.
--
-- Conventions: ids are text UUIDs, dates are ISO text in UTC (Ghana time = UTC),
-- true/false are 1/0, lists and settings are JSON text.
-- =============================================================================

PRAGMA foreign_keys = ON;

-- People who may use the CRM. Cloudflare Access checks the email first; this table decides the role.
-- The first admin is added automatically from the ADMIN_EMAILS setting (see DEPLOY.md).
CREATE TABLE IF NOT EXISTS staff (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS clients (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  organisation     TEXT,
  phone            TEXT,
  email            TEXT COLLATE NOCASE,
  service          TEXT,
  source           TEXT,
  marketing_opt_in INTEGER NOT NULL DEFAULT 0,   -- 1 = agreed to receive promotions
  notes            TEXT,
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS clients_email ON clients (email);
CREATE INDEX IF NOT EXISTS clients_phone ON clients (phone);

CREATE TABLE IF NOT EXISTS bookings (
  id           TEXT PRIMARY KEY,
  client_id    TEXT REFERENCES clients (id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  organisation TEXT,
  email        TEXT,
  phone        TEXT,
  service      TEXT,
  details      TEXT,
  budget       TEXT,
  timeline     TEXT,
  method       TEXT,
  call_at      TEXT,                              -- date and time of the free call
  source       TEXT,
  status       TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'confirmed', 'done', 'cancelled', 'no_show')),
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS bookings_created ON bookings (created_at);

CREATE TABLE IF NOT EXISTS enquiries (
  id           TEXT PRIMARY KEY,
  client_id    TEXT REFERENCES clients (id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  email        TEXT,
  phone        TEXT,
  organisation TEXT,
  needs        TEXT,
  message      TEXT,
  status       TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'replied', 'closed')),
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS deals (
  id          TEXT PRIMARY KEY,
  client_id   TEXT REFERENCES clients (id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  service     TEXT,
  value       REAL NOT NULL DEFAULT 0,            -- GH₵
  stage       TEXT NOT NULL DEFAULT 'new' CHECK (stage IN ('new', 'call', 'quote', 'progress', 'won', 'lost')),
  closed_at   TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS projects (
  id               TEXT PRIMARY KEY,
  client_id        TEXT REFERENCES clients (id) ON DELETE SET NULL,
  title            TEXT NOT NULL,
  service          TEXT,
  status           TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'review', 'delivered', 'on_hold')),
  progress         INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  value            REAL NOT NULL DEFAULT 0,       -- GH₵, never shown on the website
  start_date       TEXT,
  due_date         TEXT,
  show_on_website  INTEGER NOT NULL DEFAULT 0,
  website_summary  TEXT,
  website_outcome  TEXT,
  live_url         TEXT,
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS reviews (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  organisation TEXT,
  role         TEXT,
  rating       INTEGER CHECK (rating BETWEEN 1 AND 5),
  message      TEXT NOT NULL,
  consent      INTEGER NOT NULL DEFAULT 0,        -- 1 = client allowed us to publish it
  product      TEXT,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- On/off switches for parts of the website. To add a new switch: add a row here (and in the
-- INSERT below), then read it in the website with getSections() from src/lib/crm.ts.
CREATE TABLE IF NOT EXISTS site_sections (
  key         TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  location    TEXT,
  enabled     INTEGER NOT NULL DEFAULT 1,
  sort        INTEGER NOT NULL DEFAULT 0,
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
INSERT OR IGNORE INTO site_sections (key, label, location, enabled, sort) VALUES
  ('help_widget',      'Help chat bubble',          'Every page',                 1, 1),
  ('testimonials',     'What clients say',          'Home and product pages',     1, 2),
  ('accept_reviews',   'Accept new reviews',        'Share your experience page', 1, 3),
  ('recent_designs',   'Recent designs',            'Home',                       1, 4),
  ('service_examples', 'Examples of our work',      'Services',                   1, 5),
  ('urgent_booking',   'Urgent (express) bookings', 'Booking form',               1, 6),
  ('blog',             'Blog',                      'Footer and menu link',       1, 7),
  ('careers',          'Open roles',                'Careers page',               1, 8),
  ('donate',           'Donate',                    'Footer and menu link',       1, 9);

CREATE TABLE IF NOT EXISTS campaigns (
  id            TEXT PRIMARY KEY,
  channel       TEXT NOT NULL CHECK (channel IN ('sms', 'whatsapp', 'email')),
  kind          TEXT NOT NULL DEFAULT 'promotion' CHECK (kind IN ('promotion', 'update')),
  audience      TEXT NOT NULL,                    -- readable label, e.g. "All clients who opted in"
  audience_spec TEXT NOT NULL DEFAULT '{}',       -- JSON: {"type":"opted_in"} | {"type":"client","client_id":"…"} | {"type":"service","service":"…"}
  subject       TEXT,
  message       TEXT NOT NULL,
  recipients    INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'scheduled', 'sent', 'failed')),
  scheduled_at  TEXT,
  sent_at       TEXT,
  error         TEXT,
  created_by    TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS campaigns_due ON campaigns (status, scheduled_at);

CREATE TABLE IF NOT EXISTS activity (
  id          TEXT PRIMARY KEY,
  entity      TEXT NOT NULL,
  entity_id   TEXT,
  action      TEXT NOT NULL,
  detail      TEXT,
  actor       TEXT,                               -- staff email
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Questions the website help bubble could not answer. Use them to add answers in src/data/help.ts.
CREATE TABLE IF NOT EXISTS help_questions (
  id          TEXT PRIMARY KEY,
  question    TEXT NOT NULL,
  page        TEXT,
  done        INTEGER NOT NULL DEFAULT 0,          -- 1 = answer added to the help bubble
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Simple limit on form posts per visitor, to slow down spam bots.
CREATE TABLE IF NOT EXISTS form_hits (
  ip_hash     TEXT NOT NULL,
  minute      TEXT NOT NULL,
  hits        INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (ip_hash, minute)
);

-- Service orders, their updates and files, and payments (also in migrations/0001).
CREATE TABLE IF NOT EXISTS orders (
  id                 TEXT PRIMARY KEY,
  ref                TEXT NOT NULL UNIQUE,                 -- shown to the client, e.g. JT9-7K4Q2M
  token              TEXT NOT NULL UNIQUE,                 -- secret part of the client's private order link
  client_id          TEXT REFERENCES clients (id) ON DELETE SET NULL,
  name               TEXT NOT NULL,
  email              TEXT,
  phone              TEXT,
  organisation       TEXT,
  service            TEXT,
  title              TEXT,
  brief              TEXT,
  materials_link     TEXT,                                 -- Google Drive / WeTransfer link for big files
  wanted_by          TEXT,                                 -- date the client would like it by (YYYY-MM-DD)
  status             TEXT NOT NULL DEFAULT 'requested'
                     CHECK (status IN ('requested', 'quoted', 'in_progress', 'preview', 'changes', 'approved', 'completed', 'cancelled')),
  currency           TEXT NOT NULL DEFAULT 'GHS',
  total              INTEGER NOT NULL DEFAULT 0 CHECK (total >= 0),          -- pesewas
  deposit_pct        INTEGER NOT NULL DEFAULT 70 CHECK (deposit_pct BETWEEN 0 AND 100),
  turnaround_days    INTEGER CHECK (turnaround_days IS NULL OR turnaround_days BETWEEN 1 AND 365),
  revisions_included INTEGER NOT NULL DEFAULT 2 CHECK (revisions_included BETWEEN 0 AND 20),
  revisions_used     INTEGER NOT NULL DEFAULT 0,
  quote_note         TEXT,
  quoted_at          TEXT,
  deposit_paid_at    TEXT,
  materials_ready_at TEXT,
  started_at         TEXT,                                 -- later of deposit paid and materials received
  due_at             TEXT,                                 -- started_at + turnaround_days
  preview_url        TEXT,
  preview_at         TEXT,                                 -- first preview; later than due_at = 10% off the balance
  final_url          TEXT,                                 -- shown to the client only after the balance is paid
  approved_at        TEXT,
  balance_paid_at    TEXT,
  completed_at       TEXT,
  review_rating      INTEGER CHECK (review_rating IS NULL OR review_rating BETWEEN 1 AND 5),
  review_message     TEXT,
  consent_review     INTEGER NOT NULL DEFAULT 0,
  consent_portfolio  INTEGER NOT NULL DEFAULT 0,
  reviewed_at        TEXT,
  notes              TEXT,                                 -- internal, never shown to the client
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS orders_status ON orders (status, created_at);

CREATE TABLE IF NOT EXISTS order_updates (
  id          TEXT PRIMARY KEY,
  order_id    TEXT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  author      TEXT NOT NULL CHECK (author IN ('team', 'client', 'system')),
  message     TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS order_updates_order ON order_updates (order_id, created_at);

CREATE TABLE IF NOT EXISTS order_files (
  id          TEXT PRIMARY KEY,
  order_id    TEXT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  r2_key      TEXT NOT NULL,
  name        TEXT NOT NULL,
  size        INTEGER NOT NULL DEFAULT 0,
  type        TEXT,
  kind        TEXT NOT NULL DEFAULT 'client' CHECK (kind IN ('client', 'preview', 'final')),   -- migration 0002
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS order_files_order ON order_files (order_id, kind);

CREATE TABLE IF NOT EXISTS payments (
  id           TEXT PRIMARY KEY,
  order_id     TEXT REFERENCES orders (id) ON DELETE SET NULL,
  kind         TEXT NOT NULL CHECK (kind IN ('deposit', 'balance', 'donation')),
  amount       INTEGER NOT NULL CHECK (amount > 0),     -- pesewas
  currency     TEXT NOT NULL DEFAULT 'GHS',
  reference    TEXT NOT NULL UNIQUE,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  method       TEXT NOT NULL DEFAULT 'paystack' CHECK (method IN ('paystack', 'manual')),
  channel      TEXT,                                    -- mobile_money, card, bank ... (from Paystack)
  payer_name   TEXT,
  payer_email  TEXT,
  message      TEXT,                                    -- donor's note
  paid_at      TEXT,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS payments_order ON payments (order_id);
CREATE INDEX IF NOT EXISTS payments_kind ON payments (kind, created_at);
