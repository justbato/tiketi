-- Migration 002: Add access lockout columns to orders
-- Run in Supabase SQL Editor AFTER migration 001.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS access_attempts int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS access_locked_until timestamptz;

NOTIFY pgrst, 'reload schema';
