-- Migration 001: Add poster_url and category to events
-- Run in Supabase SQL Editor after taking a backup.

ALTER TABLE events ADD COLUMN IF NOT EXISTS poster_url text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS category text;

NOTIFY pgrst, 'reload schema';

-- Seed UPDATE statements (commented out – run manually if needed):
-- UPDATE events SET poster_url = '/posters/gala_night.jpg',      category = 'Gala'    WHERE name ILIKE '%Convocation Gala%';
-- UPDATE events SET poster_url = '/posters/afrobeats_carnival.jpg', category = 'Music' WHERE name ILIKE '%AfroBeats%';
-- UPDATE events SET poster_url = '/posters/unifest_concert.jpg', category = 'Music'    WHERE name ILIKE '%Freshers Night%';
