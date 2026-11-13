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
