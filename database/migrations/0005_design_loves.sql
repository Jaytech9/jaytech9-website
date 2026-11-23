-- "Love this" hearts on the design gallery. One per visitor per design; only counts are shown.
-- visitor is a short one-way code, not an IP address. Run once:
--   npx wrangler d1 execute jaytech9 --remote --file=database/migrations/0005_design_loves.sql
CREATE TABLE IF NOT EXISTS design_loves (
  design_id   TEXT NOT NULL,                 -- gallery id as used on the website (e.g. crm-1a2b3c4d)
  visitor     TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (design_id, visitor)
);
