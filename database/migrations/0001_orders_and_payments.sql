-- Service orders (request → quote → 70% deposit → work → preview → approval → 30% balance → final files),
-- their progress updates and uploaded files, and every payment (order deposits/balances and donations).
-- Run once on the live database:
--   npx wrangler d1 execute jaytech9 --remote --file=database/migrations/0001_orders_and_payments.sql
-- Money is stored in pesewas (GH₵ 1 = 100) as whole numbers, so sums never drift.

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
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

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
