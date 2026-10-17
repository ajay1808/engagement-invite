-- Save-the-date replies: one row per reply.
-- A guest can change their own reply with a token their browser keeps;
-- only its SHA-256 hash is stored here.
CREATE TABLE save_the_date (
  id          TEXT PRIMARY KEY,
  token_hash  TEXT NOT NULL,
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,             -- +<country code><number>, digits only
  email       TEXT NOT NULL,
  attending   TEXT NOT NULL CHECK (attending IN ('yes', 'maybe', 'no')),
  guests      INTEGER CHECK (guests BETWEEN 1 AND 10),
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  edits       INTEGER NOT NULL DEFAULT 0,
  CHECK ((attending = 'no') = (guests IS NULL))
);

CREATE INDEX save_the_date_phone ON save_the_date (phone);
CREATE INDEX save_the_date_created ON save_the_date (created_at);
