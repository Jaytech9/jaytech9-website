-- Times you are not available for calls (a meeting, travel, a holiday). Hidden from the booking page.
-- slot NULL = the whole day. Run once:
--   npx wrangler d1 execute jaytech9 --remote --file=database/migrations/0003_blocked_times.sql
CREATE TABLE IF NOT EXISTS blocked_times (
  id          TEXT PRIMARY KEY,
  day         TEXT NOT NULL,                 -- YYYY-MM-DD (Ghana time)
  slot        TEXT,                          -- HH:MM, or NULL for the whole day
  reason      TEXT,                          -- internal only, never shown on the website
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS blocked_times_day ON blocked_times (day);
CREATE INDEX IF NOT EXISTS bookings_call_at ON bookings (call_at);
