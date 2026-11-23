-- Files on an order now have a kind: what the client sent, previews we send, and final files.
-- Run once:  npx wrangler d1 execute jaytech9 --remote --file=database/migrations/0002_order_file_kinds.sql
ALTER TABLE order_files ADD COLUMN kind TEXT NOT NULL DEFAULT 'client' CHECK (kind IN ('client', 'preview', 'final'));
CREATE INDEX IF NOT EXISTS order_files_order ON order_files (order_id, kind);
