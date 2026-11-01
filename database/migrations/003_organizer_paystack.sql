-- =============================================================
-- Migration 003: Event Organizers + Paystack + Approval Flow
-- =============================================================
-- Run with: psql $DATABASE_URL -f migrations/003_organizer_paystack.sql
-- Safe to run multiple times (all statements use IF NOT EXISTS / IF EXISTS).

-- ─────────────────────────────────────────────
-- 1. Rename event_planners → event_organizers
-- ─────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'event_planners'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'event_organizers'
  ) THEN
    ALTER TABLE event_planners RENAME TO event_organizers;
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 2. Drop old unique constraints on email / account_number
--    (same email & account can be used for multiple events)
-- ─────────────────────────────────────────────
DO $$ BEGIN
  -- drop any unique index/constraint named like *_email_*
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'event_organizers'::regclass
      AND contype = 'u'
      AND conname ILIKE '%email%'
  ) THEN
    EXECUTE 'ALTER TABLE event_organizers DROP CONSTRAINT IF EXISTS ' ||
      (SELECT conname FROM pg_constraint
       WHERE conrelid = 'event_organizers'::regclass
         AND contype = 'u' AND conname ILIKE '%email%' LIMIT 1);
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'event_organizers'::regclass
      AND contype = 'u'
      AND conname ILIKE '%account%'
  ) THEN
    EXECUTE 'ALTER TABLE event_organizers DROP CONSTRAINT IF EXISTS ' ||
      (SELECT conname FROM pg_constraint
       WHERE conrelid = 'event_organizers'::regclass
         AND contype = 'u' AND conname ILIKE '%account%' LIMIT 1);
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 3. Add new columns to event_organizers
-- ─────────────────────────────────────────────
ALTER TABLE event_organizers
  ADD COLUMN IF NOT EXISTS bank_code         text,
  ADD COLUMN IF NOT EXISTS bank_locked       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS first_paid_at     timestamptz,
  ADD COLUMN IF NOT EXISTS paystack_subaccount_code text;

-- Remove KYC fields if they exist (safe with IF EXISTS)
ALTER TABLE event_organizers
  DROP COLUMN IF EXISTS whatsapp_number,
  DROP COLUMN IF EXISTS university,
  DROP COLUMN IF EXISTS state,
  DROP COLUMN IF EXISTS location,
  DROP COLUMN IF EXISTS party_type;

-- ─────────────────────────────────────────────
-- 4. Add approval_status + Paystack to events
-- ─────────────────────────────────────────────
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS approval_status       text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approval_note         text,
  ADD COLUMN IF NOT EXISTS approved_by           uuid,
  ADD COLUMN IF NOT EXISTS approved_at           timestamptz,
  ADD COLUMN IF NOT EXISTS paystack_subaccount_code text,
  ADD COLUMN IF NOT EXISTS fee_percent_override  numeric(5,2),
  ADD COLUMN IF NOT EXISTS organizer_id          uuid REFERENCES event_organizers(id) ON DELETE SET NULL;

-- Back-fill organizer_id from planner_id where planner_id exists in event_organizers
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'planner_id'
  ) THEN
    UPDATE events e
    SET organizer_id = e.planner_id
    WHERE e.organizer_id IS NULL
      AND EXISTS (SELECT 1 FROM event_organizers o WHERE o.id = e.planner_id);
  END IF;
END $$;

-- ─────────────────────────────────────────────
-- 5. Extend orders table for Paystack + fee tracking
-- ─────────────────────────────────────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS gross              numeric(12,2),
  ADD COLUMN IF NOT EXISTS fee_percent_used  numeric(5,2),
  ADD COLUMN IF NOT EXISTS platform_fee      numeric(12,2),
  ADD COLUMN IF NOT EXISTS organizer_share   numeric(12,2),
  ADD COLUMN IF NOT EXISTS paystack_reference text;

-- ─────────────────────────────────────────────
-- 6. Platform settings (fee_percent, fee_bearer)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_settings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_percent     numeric(5,2) NOT NULL DEFAULT 5.00,
  fee_bearer      text NOT NULL DEFAULT 'organizer',  -- 'organizer' | 'platform'
  paystack_fee_bearer text NOT NULL DEFAULT 'account', -- 'account' | 'subaccount'
  updated_at      timestamptz NOT NULL DEFAULT now(),
  updated_by      uuid
);

-- Seed one row if empty
INSERT INTO platform_settings (fee_percent, fee_bearer)
SELECT 5.00, 'organizer'
WHERE NOT EXISTS (SELECT 1 FROM platform_settings);

-- ─────────────────────────────────────────────
-- 7. Fee percent change audit log
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fee_percent_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  old_percent numeric(5,2),
  new_percent numeric(5,2) NOT NULL,
  changed_by  uuid NOT NULL,
  event_id    uuid,           -- NULL = global setting change
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- 8. Bank detail change audit log
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bank_change_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        uuid NOT NULL REFERENCES events(id),
  old_bank_name   text,
  old_account_number text,
  old_account_name   text,
  new_bank_name   text NOT NULL,
  new_account_number text NOT NULL,
  new_account_name   text NOT NULL,
  changed_by      uuid NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────
-- 9. Index: fast lookup of organizer by email
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_event_organizers_email
  ON event_organizers (email);

CREATE INDEX IF NOT EXISTS idx_events_approval_status
  ON events (approval_status);

CREATE INDEX IF NOT EXISTS idx_orders_paystack_reference
  ON orders (paystack_reference);
