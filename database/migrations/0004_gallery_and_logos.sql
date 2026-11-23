-- Design gallery pieces and "Trusted by" client logos, managed in the CRM (CRM → Gallery, CRM → Client logos).
-- Files live in the R2 bucket under gallery/ and logos/ and are served by the website at /media/…
-- Run once:  npx wrangler d1 execute jaytech9 --remote --file=database/migrations/0004_gallery_and_logos.sql
CREATE TABLE IF NOT EXISTS gallery_items (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  category    TEXT NOT NULL,                 -- logos, flyers, banners, social-media, church-events, business-cards, fashion-beauty, packaging-merch
  year        INTEGER NOT NULL,
  client      TEXT,                          -- only with the client's permission
  note        TEXT,
  alt         TEXT,
  image_key   TEXT NOT NULL,                 -- R2 key of the picture (or the video's cover)
  image_w     INTEGER NOT NULL DEFAULT 1200,
  image_h     INTEGER NOT NULL DEFAULT 1200,
  video_key   TEXT,                          -- R2 key of a short .mp4, if any
  platform    TEXT CHECK (platform IS NULL OR platform IN ('tiktok', 'instagram', 'youtube', 'facebook')),
  post_url    TEXT,                          -- link to the post, e.g. on TikTok
  featured    INTEGER NOT NULL DEFAULT 0,    -- also shows in "Recent designs" on the home page
  show        INTEGER NOT NULL DEFAULT 1,    -- 0 = hidden from the website
  sort        INTEGER NOT NULL DEFAULT 100,  -- lower shows first
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE TABLE IF NOT EXISTS brand_logos (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  logo_key    TEXT,                          -- R2 key; the name shows until a logo is added
  url         TEXT,
  show        INTEGER NOT NULL DEFAULT 1,
  sort        INTEGER NOT NULL DEFAULT 100,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
